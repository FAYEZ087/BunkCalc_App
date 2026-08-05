import React from 'react';

interface Props {
  title: string;
  type: 'privacy' | 'terms';
  onClose: () => void;
}

const LegalModal: React.FC<Props> = ({ title, type, onClose }) => {
  return (
    <div className="fixed inset-0 bg-white dark:bg-black/95 z-[60] flex flex-col animate-in fade-in duration-200">
      <header className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
        <button onClick={onClose} className="bg-slate-200 dark:bg-slate-800 p-2 rounded-lg text-slate-600 dark:text-slate-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>
      
      <div className="flex-1 overflow-y-auto p-6 text-slate-600 dark:text-slate-300 text-sm leading-relaxed space-y-6">
        {type === 'privacy' ? (
          <>
            <p className="text-slate-500 dark:text-slate-400 text-xs italic">Effective Date: August 5, 2026 &bull; Version 1.1.2</p>
            
            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">1. Introduction</h3>
              <p>BunkCalc ("the App", "we", "our", "us") is a mobile attendance-tracking application developed and maintained independently in India. This Privacy Policy describes how the App handles information when you install and use BunkCalc on your personal device. By using BunkCalc, you acknowledge that you have read and understood this Privacy Policy.</p>
            </section>

            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">2. Our Privacy Commitment</h3>
              <p>BunkCalc is designed with a <span className="text-slate-900 dark:text-white font-bold">local-first, zero-collection architecture</span>. All your data — including attendance records, subject schedules, semester preferences, and application settings — is stored exclusively on your device using the platform's native encrypted key-value storage (SharedPreferences on Android, UserDefaults on iOS). We do not operate backend servers, databases, cloud infrastructure, or analytics platforms of any kind.</p>
              <p className="mt-2">In simple terms: <span className="text-slate-900 dark:text-white font-bold italic">your data never leaves your device</span>.</p>
            </section>

            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">3. Information We Do Not Collect</h3>
              <p>We want to be unambiguous. BunkCalc does <span className="font-bold text-slate-900 dark:text-white">not</span> collect, transmit, store on remote servers, or share with any third parties:</p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Personal Identifiable Information (PII) such as your name, email address, phone number, or student ID</li>
                <li>Location data, GPS coordinates, or IP addresses</li>
                <li>Device identifiers (IMEI, Advertising ID, hardware serial numbers)</li>
                <li>Usage analytics, behavioural data, or session recordings</li>
                <li>Crash logs or diagnostic telemetry</li>
                <li>Contacts, photos, camera, microphone, or any media</li>
              </ul>
            </section>

            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">4. Device Permissions</h3>
              <p>BunkCalc requests the following device permissions solely for the features described below. Each permission is opt-in and can be revoked at any time through your device's system settings.</p>
              <div className="mt-3 space-y-3">
                <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl">
                  <p className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-1">Notifications</p>
                  <p className="text-xs">Used to deliver scheduled class reminders before lectures, post-class attendance marking prompts, and threshold alerts when your attendance falls below the configured minimum. Notifications are scheduled locally on-device using the system alarm manager and are never routed through external push notification services.</p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl">
                  <p className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-1">Haptic Feedback / Vibration</p>
                  <p className="text-xs">Used to provide tactile confirmation when marking attendance or interacting with buttons. This can be disabled in Settings {">"} Interaction {">"} Haptic Feedback.</p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl">
                  <p className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-1">File Storage (Limited)</p>
                  <p className="text-xs">Accessed only when you manually export a backup file or generate a shareable attendance card image. BunkCalc writes temporary files to the app's cache directory and does not scan, index, or access any other files on your device.</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">5. Backup & Restore</h3>
              <p>The Backup feature exports your data as a plain JSON file saved to your device's local storage. The Restore feature reads a previously exported JSON backup. Both operations are initiated manually by you and occur entirely on-device. We have no access to these backup files.</p>
            </section>

            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">6. Share Card Feature</h3>
              <p>When you use the "Share Attendance Card" feature, BunkCalc renders your attendance summary as a PNG image on-device using HTML canvas rendering. The image is saved temporarily to your app cache and shared via your device's native share sheet. We do not intercept, upload, or retain a copy of any shared content.</p>
            </section>

            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">7. Third-Party SDKs & Services</h3>
              <p>BunkCalc is built using the open-source <span className="font-bold text-slate-900 dark:text-white">Apache Capacitor</span> framework. Capacitor plugins operate locally and do not transmit data to external servers. The App does not integrate any third-party analytics SDKs (Google Analytics, Firebase, Mixpanel, etc.), advertising networks, social media trackers, or crash reporting services.</p>
            </section>

            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">8. Data Retention & Deletion</h3>
              <p>Your data persists on your device until you take one of the following actions:</p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Use the <span className="font-bold text-slate-900 dark:text-white">Reset App</span> function in Settings {">"} Data Management</li>
                <li>Clear the app's data or cache through your device's system settings</li>
                <li>Uninstall the application</li>
              </ul>
              <p className="mt-2">Since all data is local, deletion is immediate and permanent. We cannot recover your data after deletion as we never had access to it.</p>
            </section>

            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">9. Children's Privacy</h3>
              <p>BunkCalc is designed for university and college students (typically aged 17+). We do not knowingly target or collect data from children under the age of 13. Since no data is collected from any user, this policy applies uniformly regardless of age.</p>
            </section>

            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">10. Changes to This Policy</h3>
              <p>We may update this Privacy Policy from time to time. Any changes will be reflected within the app with an updated "Effective Date" at the top of this document. Continued use of BunkCalc after changes constitutes acceptance of the revised policy.</p>
            </section>
          </>
        ) : (
          <>
            <p className="text-slate-500 dark:text-slate-400 text-xs italic">Effective Date: August 5, 2026 &bull; Version 1.1.2</p>
            
            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">1. Acceptance of Terms</h3>
              <p>By downloading, installing, or using BunkCalc ("the App"), you ("the User") agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must not use the App. These Terms constitute a legally binding agreement between you and BunkCalc.</p>
            </section>
            
            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">2. Description of Service</h3>
              <p>BunkCalc is a personal attendance management tool designed for university and college students in India. The App allows users to:</p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Track daily class attendance across multiple subjects</li>
                <li>Calculate safe bunk budgets based on semester-forward calculations and target thresholds</li>
                <li>Mark lab sessions (displayed as 2-hour timetable blocks without inflating attendance counts) and cancelled classes</li>
                <li>Receive local push notifications for upcoming classes and attendance alerts</li>
                <li>View semester-end projections, recovery mode guidance, and attendance statistics</li>
                <li>Export, backup, and share attendance summaries</li>
              </ul>
              <p className="mt-2">The App operates entirely offline with local-only data storage. No account creation, registration, or internet connection is required for core functionality.</p>
            </section>
            
            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">3. Eligibility</h3>
              <p>BunkCalc is intended for use by individuals aged 17 and above, primarily enrolled students at recognised educational institutions. By using the App, you represent that you meet this age requirement.</p>
            </section>
            
            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">4. Accuracy of Calculations</h3>
              <p>BunkCalc performs attendance calculations based on the data you manually input, including subject details, class schedules, and daily attendance records. While we endeavour to ensure mathematical accuracy in all computations (attendance percentage, safe bunk budget, semester projections, and threshold alerts), the App is provided as an <span className="font-bold text-slate-900 dark:text-white">assistive tool only</span>.</p>
              <p className="mt-2">You acknowledge and agree that:</p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>The accuracy of results depends entirely on the accuracy of the data you provide</li>
                <li>BunkCalc does not sync with, verify against, or replace your institution's official attendance management system (e.g., SAP, ERP portals)</li>
                <li>Discrepancies may arise due to institutional policies including but not limited to: retroactive attendance corrections, extra classes, make-up lectures, or administrative overrides</li>
                <li>You are solely responsible for cross-verifying your attendance with your institution's official records before making any academic decisions</li>
              </ul>
            </section>
            
            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">5. Disclaimer of Warranties</h3>
              <p>THE APP IS PROVIDED ON AN <span className="font-bold text-slate-900 dark:text-white">"AS IS" AND "AS AVAILABLE"</span> BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p>
              <p className="mt-2">We do not warrant that the App will be uninterrupted, error-free, or free of harmful components. We do not guarantee that calculation results will always be accurate or complete.</p>
            </section>
            
            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">6. Limitation of Liability</h3>
              <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL BUNKCALC, ITS DEVELOPERS, CONTRIBUTORS, OR AFFILIATES BE LIABLE FOR ANY:</p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Academic penalties, debarment, detention, or loss of examination eligibility</li>
                <li>Loss of credits, grades, scholarships, or academic standing</li>
                <li>Incorrect attendance calculations arising from erroneous user input</li>
                <li>Data loss resulting from device failure, app uninstallation, or failure to create backups</li>
                <li>Any indirect, incidental, special, consequential, or punitive damages</li>
              </ul>
              <p className="mt-2">Your use of BunkCalc and any reliance on its calculations is entirely at your own risk.</p>
            </section>
            
            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">7. User Responsibilities</h3>
              <p>As a user of BunkCalc, you agree to:</p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Provide accurate subject schedules, class timings, and attendance data</li>
                <li>Regularly back up your data using the built-in Backup feature if you wish to preserve it</li>
                <li>Not rely solely on BunkCalc for critical academic decisions without cross-referencing official records</li>
                <li>Use the App in compliance with your institution's academic integrity policies</li>
                <li>Not reverse-engineer, decompile, disassemble, or attempt to extract the source code of the App</li>
              </ul>
            </section>
            
            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">8. Data Ownership & Portability</h3>
              <p>You own all data you enter into BunkCalc. Since the App stores data locally on your device, you have complete control over your information. You may export your data at any time using the Backup feature and delete it permanently using the Reset function. We do not retain, access, or have the ability to retrieve any of your data.</p>
            </section>
            
            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">9. Intellectual Property</h3>
              <p>The BunkCalc name, logo, user interface design, iconography, and all associated visual and textual content are the intellectual property of BunkCalc and its creators. You may not reproduce, distribute, modify, or create derivative works based on the App's branding or design without prior written consent.</p>
            </section>
            
            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">10. Termination</h3>
              <p>You may stop using BunkCalc at any time by uninstalling the App. We reserve the right to discontinue, modify, or update the App at any time without prior notice. Upon uninstallation, all locally stored data will be permanently deleted by the operating system.</p>
            </section>
            
            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">11. Governing Law & Jurisdiction</h3>
              <p>These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising from or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts located in Bhubaneswar, Odisha, India.</p>
            </section>
            
            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">12. Modifications to Terms</h3>
              <p>We reserve the right to update or modify these Terms at any time. Changes will take effect immediately upon being published within the App with an updated "Effective Date". Your continued use of BunkCalc after any modifications constitutes your acceptance of the revised Terms.</p>
            </section>
            
            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">13. Severability</h3>
              <p>If any provision of these Terms is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect.</p>
            </section>
          </>
        )}
        <div className="pt-10 pb-10 text-center text-slate-400 dark:text-slate-500 text-[10px]">
          Last Updated: August 5, 2026 &bull; BunkCalc v1.1.2
        </div>
      </div>
    </div>
  );
};

export default LegalModal;
