"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.processReminders = exports.checkUnresolvedProblems = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const date_fns_1 = require("date-fns");
admin.initializeApp();
const db = admin.firestore();
/**
 * Scheduled function running every day at 9:00 AM.
 * Finds unresolved problems older than X days for users with push notifications enabled
 * and sends multicast push alerts.
 */
exports.checkUnresolvedProblems = (0, scheduler_1.onSchedule)({
    schedule: '0 9 * * *',
    timeZone: 'Europe/Kiev',
}, async (event) => {
    console.log('Running checkUnresolvedProblems scheduled task...');
    try {
        // 1. Get all users who have FCM tokens and settings.pushEnabled === true
        const usersSnap = await db.collection('users').get();
        const activeUsers = usersSnap.docs.filter(doc => {
            const data = doc.data();
            return data.tokens && data.tokens.length > 0 && data.settings?.pushEnabled === true;
        });
        console.log(`Found ${activeUsers.length} users with push notifications enabled.`);
        for (const userDoc of activeUsers) {
            const userId = userDoc.id;
            const userData = userDoc.data();
            const tokens = userData.tokens;
            const remindDays = userData.settings?.remindDays ?? 3; // default 3 days
            // Calculate threshold date (now - remindDays)
            const thresholdDate = (0, date_fns_1.addDays)(new Date(), -remindDays);
            console.log(`Checking user: ${userId}, remindDays: ${remindDays}, threshold: ${thresholdDate.toISOString()}`);
            // 2. Query all cars owned by this user
            const carsSnap = await db.collection('cars').where('ownerId', '==', userId).get();
            if (carsSnap.empty)
                continue;
            let totalUnresolvedProblems = 0;
            const carsWithProblems = [];
            for (const carDoc of carsSnap.docs) {
                const carId = carDoc.id;
                const carData = carDoc.data();
                // 3. Query all problems for this car
                const historySnap = await db.collection('cars').doc(carId).collection('history')
                    .where('type', '==', 'problem')
                    .get();
                const unresolvedProblems = historySnap.docs.filter(entryDoc => {
                    const entry = entryDoc.data();
                    const isUnresolved = !entry.linkedSolutionId;
                    const createdAt = new Date(entry.createdAt);
                    const isOlderThanThreshold = createdAt <= thresholdDate;
                    return isUnresolved && isOlderThanThreshold;
                });
                if (unresolvedProblems.length > 0) {
                    totalUnresolvedProblems += unresolvedProblems.length;
                    carsWithProblems.push({
                        make: carData.make || '',
                        model: carData.model || '',
                        plate: carData.plate || '',
                        count: unresolvedProblems.length
                    });
                }
            }
            if (totalUnresolvedProblems > 0) {
                console.log(`User ${userId} has ${totalUnresolvedProblems} unresolved problems. Sending FCM...`);
                // Group info for notification body
                const carDetails = carsWithProblems
                    .map(c => `${c.make} ${c.model} (${c.plate}): ${c.count}`)
                    .join('\n');
                // Multicast message payload
                const payload = {
                    tokens: tokens,
                    notification: {
                        title: '🔔 Незакриті проблеми авто',
                        body: `У вас є ${totalUnresolvedProblems} незакритих проблем:\n${carDetails}`,
                    },
                    data: {
                        type: 'unresolved_problems'
                    }
                };
                const response = await admin.messaging().sendEachForMulticast(payload);
                console.log(`Sent to user ${userId}: success count = ${response.successCount}, failure count = ${response.failureCount}`);
                // Cleanup invalid/unregistered tokens if any
                if (response.failureCount > 0) {
                    const validTokens = [];
                    response.responses.forEach((res, idx) => {
                        if (res.success) {
                            validTokens.push(tokens[idx]);
                        }
                        else if (res.error) {
                            const code = res.error.code;
                            if (code === 'messaging/invalid-registration-token' ||
                                code === 'messaging/registration-token-not-registered') {
                                console.log(`Removing expired token: ${tokens[idx]}`);
                            }
                            else {
                                validTokens.push(tokens[idx]);
                            }
                        }
                    });
                    await db.collection('users').doc(userId).update({ tokens: validTokens });
                }
            }
        }
    }
    catch (error) {
        console.error('Error in checkUnresolvedProblems:', error);
    }
});
/**
 * Scheduled function running every 15 minutes.
 * Processes history entries of type 'reminder' that are pending and due,
 * sends FCM alert, updates status to 'sent', and schedules next recurrence if needed.
 */
exports.processReminders = (0, scheduler_1.onSchedule)({
    schedule: '*/3 * * * *',
    timeZone: 'Europe/Kiev',
}, async (event) => {
    console.log('Running processReminders scheduled task...');
    try {
        const kievNow = new Date(new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Kiev' }).replace(' ', 'T') + 'Z');
        const currentDateStr = (0, date_fns_1.format)(kievNow, 'yyyy-MM-dd');
        const currentTimeStr = (0, date_fns_1.format)(kievNow, 'HH:mm');
        console.log(`Current Time (Kiev): ${currentDateStr} ${currentTimeStr}`);
        // 1. Query all reminders across all cars where status is pending
        const remindersSnap = await db.collectionGroup('history')
            .where('type', '==', 'reminder')
            .where('reminderStatus', '==', 'pending')
            .get();
        console.log(`Found ${remindersSnap.size} pending reminders to evaluate.`);
        for (const reminderDoc of remindersSnap.docs) {
            const reminder = reminderDoc.data();
            const reminderRef = reminderDoc.ref;
            // Combine Date and Time
            const remDateStr = reminder.reminderDate; // yyyy-MM-dd
            const remTimeStr = reminder.reminderTime || '09:00'; // HH:mm
            if (!remDateStr)
                continue;
            const reminderDateTime = new Date(`${remDateStr}T${remTimeStr}Z`);
            // Check if due
            if (reminderDateTime <= kievNow) {
                console.log(`Reminder ${reminderDoc.id} is due. Date: ${remDateStr} ${remTimeStr}`);
                // Fetch parent car info
                const carDocRef = reminderRef.parent.parent;
                if (!carDocRef)
                    continue;
                const carSnap = await carDocRef.get();
                const car = carSnap.data() || {};
                const carId = carSnap.id;
                // Fetch author/user FCM tokens
                const authorId = reminder.authorId;
                if (!authorId)
                    continue;
                const userDoc = await db.collection('users').doc(authorId).get();
                if (!userDoc.exists)
                    continue;
                const userData = userDoc.data() || {};
                const tokens = userData.tokens;
                if (tokens && tokens.length > 0 && userData.settings?.pushEnabled === true) {
                    const payload = {
                        tokens: tokens,
                        notification: {
                            title: `🔔 Нагадування: ${car.make || ''} ${car.model || ''} (${car.plate || ''})`,
                            body: reminder.text || 'Настав час для запланованої події.',
                        },
                        data: {
                            type: 'reminder',
                            carId: carId,
                            entryId: reminderDoc.id
                        }
                    };
                    const response = await admin.messaging().sendEachForMulticast(payload);
                    console.log(`Sent reminder push: success count = ${response.successCount}`);
                }
                else {
                    console.log(`FCM skipped for user ${authorId}: tokens empty or push disabled.`);
                }
                // Update reminder status
                await reminderRef.update({ reminderStatus: 'sent' });
                // Handle recurrence
                const recurrence = reminder.reminderRecurrence; // 'once' | 'daily' | 'weekly' | 'monthly'
                if (recurrence && recurrence !== 'once') {
                    let nextDate = new Date(`${remDateStr}T${remTimeStr}Z`);
                    if (recurrence === 'daily') {
                        nextDate = (0, date_fns_1.addDays)(nextDate, 1);
                    }
                    else if (recurrence === 'weekly') {
                        nextDate = (0, date_fns_1.addWeeks)(nextDate, 1);
                    }
                    else if (recurrence === 'monthly') {
                        nextDate = (0, date_fns_1.addMonths)(nextDate, 1);
                    }
                    const nextDateStr = (0, date_fns_1.format)(nextDate, 'yyyy-MM-dd');
                    const nextTimeStr = (0, date_fns_1.format)(nextDate, 'HH:mm');
                    // Create new pending reminder entry in history
                    await reminderRef.parent.add({
                        type: 'reminder',
                        text: reminder.text,
                        authorId: reminder.authorId,
                        createdAt: new Date().toISOString(),
                        reminderDate: nextDateStr,
                        reminderTime: nextTimeStr,
                        reminderStatus: 'pending',
                        reminderRecurrence: recurrence,
                        runtimeMileage: reminder.runtimeMileage || 0,
                        mileageDiff: 0
                    });
                    console.log(`Scheduled next recurring reminder for ${nextDateStr} ${nextTimeStr}`);
                }
            }
        }
    }
    catch (error) {
        console.error('Error in processReminders:', error);
    }
});
//# sourceMappingURL=index.js.map