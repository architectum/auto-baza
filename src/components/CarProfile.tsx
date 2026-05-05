import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { Car, HistoryEntry } from '../types';
import { ArrowLeft, Edit2, Check, AlertCircle, Wrench, Info, Activity, CalendarDays, MessageSquare } from 'lucide-react';
import { handleFirestoreError, OperationType, cn } from '../lib/utils';
import { VoiceAssistant } from './VoiceAssistant';
import { PhotoAssistant } from './PhotoAssistant';

export function CarProfile({ carPlate, userId, onBack }: { carPlate: string | null, userId: string, onBack: () => void }) {
  const [car, setCar] = useState<Partial<Car>>({ plate: carPlate || '' });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isEditing, setIsEditing] = useState(!carPlate);
  const [loading, setLoading] = useState(!!carPlate);

  useEffect(() => {
    if (!carPlate) {
      setLoading(false);
      return;
    }
    const fetchCar = async () => {
      try {
        const docRef = doc(db, 'cars', carPlate);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCar(docSnap.data() as Car);
        } else {
          setIsEditing(true);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `cars/${carPlate}`);
      } finally {
        setLoading(false);
      }
    };
    fetchCar();

    const q = query(collection(db, 'cars', carPlate, 'history'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryEntry));
      setHistory(data);
    }, err => {
      handleFirestoreError(err, OperationType.LIST, `cars/${carPlate}/history`);
    });
    return unsub;
  }, [carPlate]);

  const handleSaveCar = async () => {
    if (!car.plate) return alert('Plate is required');
    try {
      const docRef = doc(db, 'cars', car.plate.toUpperCase());
      const now = new Date().toISOString();
      const payload = {
        ...car,
        plate: car.plate.toUpperCase(),
        ownerId: userId,
        updatedAt: now,
        createdAt: car.createdAt || now
      };
      
      const finalPayload = {
        plate: payload.plate || '',
        ownerId: payload.ownerId || '',
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
        make: payload.make || '',
        model: payload.model || '',
        year: Number(payload.year) || 0,
        mileage: Number(payload.mileage) || 0,
        color: payload.color || '',
        bodyType: payload.bodyType || '',
        clientName: payload.clientName || '',
        clientPhone: payload.clientPhone || '',
        note: payload.note || ''
      };
      
      const exists = (await getDoc(docRef)).exists();
      if (!exists) {
        await setDoc(docRef, finalPayload);
      } else {
        await updateDoc(docRef, finalPayload);
      }
      setCar(finalPayload);
      setIsEditing(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `cars/${car.plate}`);
    }
  };

  const handleAIExtractedData = (data: Partial<Car>) => {
    setCar(prev => ({
      ...prev,
      ...data,
      plate: data.plate ? data.plate.toUpperCase() : prev.plate
    }));
    setIsEditing(true);
  };

  const handleCreateHistory = async (data: Partial<HistoryEntry>) => {
    if (!car.plate) return;
    try {
      const newMileage = data.runtimeMileage || car.mileage || 0;
      let mileageDiff = 0;
      if (car.mileage && newMileage) {
        mileageDiff = newMileage - car.mileage;
      }
      
      const payload = {
        type: data.type || 'note',
        text: data.text || '',
        runtimeMileage: newMileage,
        mileageDiff,
        authorId: userId,
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'cars', car.plate, 'history'), payload);

      if (newMileage > (car.mileage || 0)) {
        await updateDoc(doc(db, 'cars', car.plate), {
          mileage: newMileage,
          updatedAt: new Date().toISOString()
        });
        setCar(prev => ({ ...prev, mileage: newMileage }));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `cars/${car.plate}/history`);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-900 dark:text-white"><div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto" /></div>;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 max-w-3xl mx-auto min-h-screen">
      <div className="p-4 bg-white dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shadow-sm">
        <button onClick={onBack} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="font-mono bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1 rounded text-gray-900 dark:text-white tracking-widest font-bold shadow-sm">
          {car.plate || 'NEW VEHICLE'}
        </div>
        <button onClick={() => isEditing ? handleSaveCar() : setIsEditing(true)} className="text-blue-600 dark:text-blue-400 hover:text-blue-500 p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          {isEditing ? <Check className="w-6 h-6 text-green-600 dark:text-green-400" /> : <Edit2 className="w-5 h-5" />}
        </button>
      </div>

      <div className="p-4 sm:p-6 overflow-y-auto pb-32">
        {isEditing ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50">
               <span className="text-sm font-medium text-blue-800 dark:text-blue-300 flex-1">Auto-fill fast via AI:</span>
               <div className="flex items-center gap-4">
                 <PhotoAssistant onDataExtracted={handleAIExtractedData} />
                 <VoiceAssistant context="car" onDataExtracted={handleAIExtractedData} className="!flex-row" />
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 px-1">LICENSE PLATE</label>
                <input type="text" value={car.plate || ''} onChange={e => setCar({...car, plate: e.target.value.toUpperCase()})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white font-mono uppercase text-lg shadow-inner focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-60" placeholder="AX-1234-BB" disabled={!!carPlate} />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 px-1">MAKE</label>
                <input type="text" value={car.make || ''} onChange={e => setCar({...car, make: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 px-1">MODEL</label>
                <input type="text" value={car.model || ''} onChange={e => setCar({...car, model: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 px-1">YEAR</label>
                <input type="number" value={car.year || ''} onChange={e => setCar({...car, year: parseInt(e.target.value)})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 px-1">MILEAGE (KM)</label>
                <input type="number" value={car.mileage || ''} onChange={e => setCar({...car, mileage: parseInt(e.target.value)})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 px-1">COLOR</label>
                <input type="text" value={car.color || ''} onChange={e => setCar({...car, color: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 px-1">BODY TYPE</label>
                <input type="text" value={car.bodyType || ''} onChange={e => setCar({...car, bodyType: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              
              <div className="col-span-2 pt-5 border-t border-gray-200 dark:border-gray-700 mt-2">
                <h3 className="text-gray-900 dark:text-gray-300 font-semibold mb-3">Client Info</h3>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 px-1">NAME</label>
                <input type="text" value={car.clientName || ''} onChange={e => setCar({...car, clientName: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 px-1">PHONE</label>
                <input type="text" value={car.clientPhone || ''} onChange={e => setCar({...car, clientPhone: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 px-1">NOTES</label>
                <textarea value={car.note || ''} onChange={e => setCar({...car, note: e.target.value})} placeholder="General issues or preferences..." className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
            </div>
            <button onClick={handleSaveCar} className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5">Save Vehicle Details</button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200 dark:border-gray-700 mb-8 max-w-full overflow-hidden">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 truncate leading-tight">{car.make} {car.model}</h2>
            <div className="flex flex-wrap gap-2 sm:gap-3 text-sm text-gray-600 dark:text-gray-400 mb-6 font-medium">
              <span className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-md">{car.year}</span>
              <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-md font-mono">{car.mileage?.toLocaleString()} km</span>
              {car.color && <span className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-md capitalize">{car.color}</span>}
              {car.bodyType && <span className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-md capitalize">{car.bodyType}</span>}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-5 border-t border-gray-100 dark:border-gray-700">
               <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Client Contact</div>
                  <div className="text-gray-900 dark:text-white font-medium text-lg">{car.clientName || 'No Name Provided'}</div>
                  <div className="text-blue-600 dark:text-blue-400 mt-0.5">{car.clientPhone || 'No Phone Number'}</div>
               </div>
               {car.note && (
                 <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">General Notes</div>
                    <div className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800">{car.note}</div>
                 </div>
               )}
            </div>
          </div>
        )}

        {!isEditing && carPlate && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6 px-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400"><CalendarDays className="w-5 h-5" /></div>
                Service History
              </h3>
            </div>
            
            <div className="space-y-4 md:space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-gray-200 dark:before:from-gray-800 before:via-gray-200 dark:before:via-gray-800 before:to-transparent">
              {history.map((entry) => (
                <div key={entry.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full border-[3px] border-gray-50 dark:border-gray-900 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10",
                    entry.type === 'problem' && "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
                    entry.type === 'solution' && "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
                    entry.type === 'mileage' && "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
                    entry.type === 'note' && "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                  )}>
                    {entry.type === 'problem' && <AlertCircle className="w-5 h-5" />}
                    {entry.type === 'solution' && <Wrench className="w-5 h-5" />}
                    {entry.type === 'note' && <Info className="w-5 h-5" />}
                    {entry.type === 'mileage' && <Activity className="w-5 h-5" />}
                  </div>
                  
                  <div className="w-[calc(100%-3.5rem)] md:w-[calc(50%-2.5rem)] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm transition-all hover:shadow-md">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 mb-2">
                       <span className={cn("font-bold uppercase tracking-wider text-xs px-2 py-0.5 rounded-full inline-block w-fit",
                          entry.type === 'problem' && "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
                          entry.type === 'solution' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400",
                          entry.type === 'mileage' && "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400",
                          entry.type === 'note' && "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                       )}>{entry.type}</span>
                       <time className="text-xs font-mono text-gray-500 dark:text-gray-400">{new Date(entry.createdAt).toLocaleDateString()} at {new Date(entry.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</time>
                    </div>
                    {entry.text && <p className="text-gray-800 dark:text-gray-200 text-sm mt-3 whitespace-pre-wrap leading-relaxed">{entry.text}</p>}
                    {(entry.runtimeMileage || entry.mileageDiff > 0) && (
                      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 dark:border-gray-700/50 pt-3">
                        {entry.runtimeMileage && (
                          <div className="text-xs font-mono font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-md">
                            {entry.runtimeMileage.toLocaleString()} km
                          </div>
                        )}
                        {entry.mileageDiff > 0 && (
                          <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span className="text-[10px]">▲</span> +{entry.mileageDiff.toLocaleString()} km
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {history.length === 0 && (
                <div className="text-center text-gray-400 dark:text-gray-500 py-12 relative z-10 w-full">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                     <MessageSquare className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="text-lg font-medium text-gray-500 dark:text-gray-400">No service history yet.</p>
                  <p className="text-sm mt-1">Tap the microphone below to dictate the first entry.</p>
                </div>
              )}
            </div>
            
          </div>
        )}
      </div>

      {!isEditing && carPlate && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 sm:pb-8 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent dark:from-gray-900 dark:via-gray-900 flex justify-center pointer-events-none z-40">
           <div className="pointer-events-auto bg-white dark:bg-gray-800 p-2 pl-5 pr-2 rounded-full border border-gray-200 dark:border-gray-700 flex items-center gap-3 shadow-xl max-w-lg w-full mx-auto justify-between transition-transform">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">Dictate Service Entry</div>
              <VoiceAssistant context="history" onDataExtracted={handleCreateHistory} className="!flex-row" />
           </div>
        </div>
      )}
    </div>
  );
}
