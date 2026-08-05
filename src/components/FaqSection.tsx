import React, { useState } from 'react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How is my Bunk Budget calculated?",
    answer: "BunkCalc uses a semester-forward formula: it calculates all scheduled classes remaining until your semester end date, combines them with any past classes entered, and computes the maximum bunks you can take while staying above your target threshold (e.g. 75%)."
  },
  {
    question: "Does a cancelled class give me a free bunk?",
    answer: "No. A cancelled class reduces your total semester session pool. Because the total session pool shrinks, your required classes count recalculates slightly downward, which slightly reduces your bunk budget rather than increasing it."
  },
  {
    question: "How do Lab sessions count in attendance?",
    answer: "Lab sessions display as a 2-hour slot on your timetable and show a 'Lab' label. In attendance calculations, each lab session counts as 1 session (identical to theory classes)."
  },
  {
    question: "What is Recovery Mode?",
    answer: "When your bunk budget drops below 0 (attendance falls below your target percentage), BunkCalc switches your subject card to Recovery Mode and highlights the exact number of consecutive classes you must attend to recover your attendance above threshold."
  },
  {
    question: "Can I enter attendance if I installed mid-semester?",
    answer: "Yes! When creating or editing a subject, use the optional 'Attended So Far' and 'Missed So Far' fields to input your past attendance history."
  },
  {
    question: "Is my data uploaded to any cloud server?",
    answer: "No. BunkCalc is 100% local-first. All your subjects, schedule, and attendance records are stored exclusively on your personal device using native encrypted storage."
  },
  {
    question: "Why can't I connect BunkCalc to my college SAP or ERP portal?",
    answer: "BunkCalc is designed as a privacy-first offline tool that does not store or request your college credentials. Direct portal integration would require handling sensitive passwords and institutional APIs. Manual tracking ensures 100% security and zero risk of account credentials leaking."
  }
];

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleIndex = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
      {FAQ_ITEMS.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div key={idx} className="transition-colors">
            <button
              onClick={() => toggleIndex(idx)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <span className="text-sm font-bold text-slate-900 dark:text-white pr-4">
                {item.question}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 shrink-0 ${
                  isOpen ? 'rotate-180 text-blue-500' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-150">
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FaqSection;
