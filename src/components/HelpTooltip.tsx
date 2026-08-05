import React, { useState, useRef, useEffect } from 'react';
import ThemedIcon from './ThemedIcon';

interface HelpTooltipProps {
  title?: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  title,
  content,
  position = 'bottom',
  align = 'center',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  let alignClass = 'left-1/2 -translate-x-1/2';
  if (align === 'left') alignClass = 'left-0';
  if (align === 'right') alignClass = 'right-0';

  let positionClasses = `top-full mt-2 ${alignClass}`;
  if (position === 'top') positionClasses = `bottom-full mb-2 ${alignClass}`;
  if (position === 'left') positionClasses = 'right-full mr-2 top-1/2 -translate-y-1/2';
  if (position === 'right') positionClasses = 'left-full ml-2 top-1/2 -translate-y-1/2';

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        aria-label="Help info"
        className="p-1 rounded-full text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors focus:outline-none"
      >
        <ThemedIcon name="help" size={16} />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 w-64 p-3 bg-slate-900 dark:bg-slate-950 text-white rounded-2xl shadow-2xl border border-slate-700/80 dark:border-slate-800 text-xs animate-in fade-in zoom-in-95 duration-150 ${positionClasses}`}
        >
          {title && (
            <div className="font-extrabold mb-1 text-blue-400 uppercase tracking-wide text-[10px]">
              {title}
            </div>
          )}
          <p className="text-slate-300 leading-relaxed font-medium">{content}</p>
        </div>
      )}
    </div>
  );
};

export default HelpTooltip;
