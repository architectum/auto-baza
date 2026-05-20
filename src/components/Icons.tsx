import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

function Icon({ children, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const AlertCircle = (props: IconProps) => <Icon {...props}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.8v5.1" /><path d="M12 16.3h.01" /></Icon>;
export const AlertTriangle = (props: IconProps) => <Icon {...props}><path d="M12 4.2 21 19H3l9-14.8Z" /><path d="M12 9v4" /><path d="M12 16.4h.01" /></Icon>;
export const Activity = (props: IconProps) => <Icon {...props}><path d="M3 12h4l2-6 5 12 3-6h4" /></Icon>;
export const ArrowLeft = (props: IconProps) => <Icon {...props}><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></Icon>;
export const ArrowRight = (props: IconProps) => <Icon {...props}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Icon>;
export const BrainCircuit = (props: IconProps) => <Icon {...props}><path d="M8.5 6.3A3.2 3.2 0 0 0 5 9.5v5A3.5 3.5 0 0 0 8.5 18" /><path d="M15.5 6.3A3.2 3.2 0 0 1 19 9.5v5a3.5 3.5 0 0 1-3.5 3.5" /><path d="M8.5 6.3V18" /><path d="M15.5 6.3V18" /><path d="M8.5 10h3l1.5-2" /><path d="M15.5 10H13" /><path d="M8.5 14H11l2 2h2.5" /><circle cx="13" cy="8" r="1" fill="currentColor" stroke="none" /><circle cx="15.5" cy="16" r="1" fill="currentColor" stroke="none" /></Icon>;
export const Bug = (props: IconProps) => <Icon {...props}><path d="M8 8.2a4 4 0 0 1 8 0" /><path d="M7 10h10v5.5a5 5 0 0 1-10 0V10Z" /><path d="M4 13h3" /><path d="M17 13h3" /><path d="M5 19l2.2-2" /><path d="M18.8 17 21 19" /><path d="M9 4l1.5 2" /><path d="M15 4l-1.5 2" /></Icon>;
export const Calendar = (props: IconProps) => <Icon {...props}><path d="M7 3v4" /><path d="M17 3v4" /><path d="M4.5 8.5h15" /><rect x="4.5" y="5" width="15" height="15" rx="3" /></Icon>;
export const CalendarDays = Calendar;
export const Camera = (props: IconProps) => <Icon {...props}><path d="M8.5 6 10 4h4l1.5 2H19a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.5Z" /><circle cx="12" cy="12.8" r="3.4" /></Icon>;
export const Car = (props: IconProps) => <Icon {...props}><path d="M5 13.5 6.8 8a2 2 0 0 1 1.9-1.4h6.6A2 2 0 0 1 17.2 8l1.8 5.5" /><path d="M4.5 13.5h15v4.2a1.6 1.6 0 0 1-1.6 1.6H6.1a1.6 1.6 0 0 1-1.6-1.6v-4.2Z" /><path d="M7 17h.01" /><path d="M17 17h.01" /><path d="M7 10h10" /></Icon>;
export const Check = (props: IconProps) => <Icon {...props}><path d="m5 12.5 4.2 4.2L19 7" /></Icon>;
export const CheckCircle = (props: IconProps) => <Icon {...props}><circle cx="12" cy="12" r="8.5" /><path d="m8 12.4 2.6 2.6L16.5 9" /></Icon>;
export const Copy = (props: IconProps) => <Icon {...props}><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M5 15.5V6.8A1.8 1.8 0 0 1 6.8 5h8.7" /></Icon>;
export const Download = (props: IconProps) => <Icon {...props}><path d="M12 4v10" /><path d="m8 10 4 4 4-4" /><path d="M5 19h14" /></Icon>;
export const Edit2 = (props: IconProps) => <Icon {...props}><path d="M4.5 19.5h4l10-10a2.2 2.2 0 0 0-4-4l-10 10v4Z" /><path d="m13.5 6.5 4 4" /></Icon>;
export const FileText = (props: IconProps) => <Icon {...props}><path d="M7 3.8h6.2L18 8.6V20H7a2 2 0 0 1-2-2V5.8a2 2 0 0 1 2-2Z" /><path d="M13 4v5h5" /><path d="M8 13h8" /><path d="M8 16h6" /></Icon>;
export const HelpCircle = (props: IconProps) => <Icon {...props}><circle cx="12" cy="12" r="8.5" /><path d="M9.7 9.2a2.5 2.5 0 1 1 4.2 1.8c-.9.8-1.9 1.3-1.9 2.8" /><path d="M12 17h.01" /></Icon>;
export const ImagePlus = (props: IconProps) => <Icon {...props}><rect x="4" y="5" width="16" height="14" rx="2.5" /><path d="m7 16 3.5-3.5 2.5 2.5 2-2 2 3" /><path d="M16.5 8.5v4" /><path d="M14.5 10.5h4" /></Icon>;
export const Info = (props: IconProps) => <Icon {...props}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5" /><path d="M12 8h.01" /></Icon>;
export const LayoutTemplate = (props: IconProps) => <Icon {...props}><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M4 10h16" /><path d="M9 10v9" /></Icon>;
export const Link2 = (props: IconProps) => <Icon {...props}><path d="M9.5 7.5 8 7.5a4.5 4.5 0 0 0 0 9h3" /><path d="M14.5 16.5H16a4.5 4.5 0 0 0 0-9h-3" /><path d="M9 12h6" /></Icon>;
export const Loader2 = (props: IconProps) => <Icon {...props}><path d="M21 12a9 9 0 1 1-3-6.7" /></Icon>;
export const Lock = (props: IconProps) => <Icon {...props}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v2" /></Icon>;
export const LogOut = (props: IconProps) => <Icon {...props}><path d="M10 5H6.8A1.8 1.8 0 0 0 5 6.8v10.4A1.8 1.8 0 0 0 6.8 19H10" /><path d="M14 8l4 4-4 4" /><path d="M18 12H9" /></Icon>;
export const MessageSquare = (props: IconProps) => <Icon {...props}><path d="M6 5h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3.2A2 2 0 0 1 4 15V7a2 2 0 0 1 2-2Z" /></Icon>;
export const Mic = (props: IconProps) => <Icon {...props}><rect x="9" y="3.5" width="6" height="10" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" /><path d="M12 18v3" /><path d="M9 21h6" /></Icon>;
export const Moon = (props: IconProps) => <Icon {...props}><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a8 8 0 1 0 9.5 9.5Z" /></Icon>;
export const Palette = (props: IconProps) => <Icon {...props}><path d="M12 4a8 8 0 0 0-8 8.2A7.8 7.8 0 0 0 12 20h1.2a1.8 1.8 0 0 0 1.2-3.1 1.4 1.4 0 0 1 1-2.4H17a3 3 0 0 0 3-3A7.5 7.5 0 0 0 12 4Z" /><circle cx="8.2" cy="11" r=".8" fill="currentColor" stroke="none" /><circle cx="10.5" cy="8" r=".8" fill="currentColor" stroke="none" /><circle cx="14" cy="8.4" r=".8" fill="currentColor" stroke="none" /></Icon>;
export const Phone = (props: IconProps) => <Icon {...props}><path d="M8.2 5.2 10 9l-2 1.6a9 9 0 0 0 5.4 5.4L15 14l3.8 1.8v3a1.7 1.7 0 0 1-1.9 1.7A14.8 14.8 0 0 1 3.5 7.1 1.7 1.7 0 0 1 5.2 5h3Z" /></Icon>;
export const Plus = (props: IconProps) => <Icon {...props}><path d="M12 5v14" /><path d="M5 12h14" /></Icon>;
export const Search = (props: IconProps) => <Icon {...props}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></Icon>;
export const Share2 = (props: IconProps) => <Icon {...props}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4" /><path d="m15.4 6.5-6.8 4" /></Icon>;
export const Send = (props: IconProps) => <Icon {...props}><path d="M20 4 10.5 21l-2-7-6.5-2L20 4Z" /><path d="m8.5 14 5-3.5" /></Icon>;
export const Settings = (props: IconProps) => <Icon {...props}><path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" /><path d="M19.4 13.5a7.9 7.9 0 0 0 .1-1.5 7.9 7.9 0 0 0-.1-1.5l2-1.5-2-3.4-2.4 1a8.2 8.2 0 0 0-2.5-1.5L14.2 2h-4.4l-.4 2.6A8.2 8.2 0 0 0 7 6.1l-2.4-1-2 3.4 2 1.5a7.9 7.9 0 0 0-.1 1.5 7.9 7.9 0 0 0 .1 1.5l-2 1.5 2 3.4 2.4-1a8.2 8.2 0 0 0 2.5 1.5l.4 2.6h4.4l.4-2.6a8.2 8.2 0 0 0 2.5-1.5l2.4 1 2-3.4-2.2-1.5Z" /></Icon>;
export const ShieldAlert = (props: IconProps) => <Icon {...props}><path d="M12 3.5 19 6v5.5c0 4.2-2.7 7.2-7 9-4.3-1.8-7-4.8-7-9V6l7-2.5Z" /><path d="M12 8v5" /><path d="M12 16.2h.01" /></Icon>;
export const Square = (props: IconProps) => <Icon {...props}><rect x="7" y="7" width="10" height="10" rx="1.5" /></Icon>;
export const Sun = (props: IconProps) => <Icon {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2.8v2" /><path d="M12 19.2v2" /><path d="M4.2 4.2 5.6 5.6" /><path d="M18.4 18.4l1.4 1.4" /><path d="M2.8 12h2" /><path d="M19.2 12h2" /><path d="M4.2 19.8l1.4-1.4" /><path d="M18.4 5.6l1.4-1.4" /></Icon>;
export const Trash2 = (props: IconProps) => <Icon {...props}><path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M7 7l.8 13h8.4L17 7" /><path d="M10 11v5" /><path d="M14 11v5" /></Icon>;
export const User = (props: IconProps) => <Icon {...props}><circle cx="12" cy="8" r="4" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></Icon>;
export const Wrench = (props: IconProps) => <Icon {...props}><path d="M15.5 5.2a4.8 4.8 0 0 0 3.3 6.1L10.5 19.6a2.5 2.5 0 0 1-3.6-3.6l8.3-8.3a4.8 4.8 0 0 0 .3-2.5Z" /><path d="M7.7 17.8h.01" /></Icon>;
export const X = (props: IconProps) => <Icon {...props}><path d="M6 6l12 12" /><path d="M18 6 6 18" /></Icon>;
export const BarChart3 = (props: IconProps) => <Icon {...props}><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></Icon>;
export const ChevronLeft = (props: IconProps) => <Icon {...props}><path d="m15 18-6-6 6-6" /></Icon>;
export const ChevronRight = (props: IconProps) => <Icon {...props}><path d="m9 18 6-6-6-6" /></Icon>;
export const Clock = (props: IconProps) => <Icon {...props}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 3" /></Icon>;
export const TrendingUp = (props: IconProps) => <Icon {...props}><path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></Icon>;
export const Paperclip = (props: IconProps) => <Icon {...props}><path d="m21.4 11.6-9-9a5.1 5.1 0 0 0-7.1 0 5.1 5.1 0 0 0 0 7.1l9.1 9.1a3.4 3.4 0 0 0 4.7 0 3.4 3.4 0 0 0 0-4.7l-9-9a1.7 1.7 0 0 0-2.4 0 1.7 1.7 0 0 0 0 2.4l8.1 8.1" /></Icon>;
export const ImageIcon = (props: IconProps) => <Icon {...props}><rect x="3" y="3" width="18" height="18" rx="2.5" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></Icon>;
export const Sparkles = (props: IconProps) => <Icon {...props}><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3l1.9 5.8 1.9-5.8a2 2 0 0 1 1.3-1.3l5.8-1.9-5.8-1.9a2 2 0 0 1-1.3-1.3z" /><path d="M19 9h2" /><path d="M19 15h2" /><path d="M15 19v2" /><path d="M9 19v2" /></Icon>;
export const Banknote = (props: IconProps) => <Icon {...props}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></Icon>;
