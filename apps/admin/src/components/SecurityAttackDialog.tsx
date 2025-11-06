import React, { useState } from 'react';
import { Dialog, DialogContent } from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { Progress } from '@workspace/ui/components/progress';

interface AttackType {
    id: string;
    name: string;
    nameEn: string;
}

const attackTypes: AttackType[] = [
    { id: '1', name: 'SQL INJECTION (SQLI)', nameEn: 'SQL INJECTION (SQLI)' },
    { id: '2', name: 'CROSS-SITE SCRIPTING (XSS)', nameEn: 'CROSS-SITE SCRIPTING (XSS)' },
    { id: '3', name: 'FILE INCLUSION (LFI/RFI)', nameEn: 'FILE INCLUSION (LFI/RFI)' },
    { id: '4', name: 'DENIAL-OF-SERVICE (DOS)', nameEn: 'DENIAL-OF-SERVICE (DOS)' },
    { id: '5', name: 'DDOS', nameEn: 'DDOS' },
    { id: '6', name: 'MITM', nameEn: 'MITM' },
    { id: '7', name: 'PHISHING', nameEn: 'PHISHING' },
];

const SecurityAttackDialog = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [selectedAttack, setSelectedAttack] = useState('1');
    const [successRate, setSuccessRate] = useState(50);

    const selectedAttackData = attackTypes.find(a => a.id === selectedAttack);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-6xl bg-black border-0 p-0 gap-0" dir="rtl">
                <div className="flex h-full bg-black p-10">
                    {/* Right Side - Attack List */}
                    <div className="w-[45%] bg-gray-950 border-l border-gray-800 p-6 flex flex-col">
                        <div className="text-right mb-6">
                            <h2 className="text-white text-sm mb-2">تیم آبی</h2>
                        </div>

                        <div className="space-y-2 flex-1 overflow-y-auto">
                            {attackTypes.map((attack) => (
                                <button
                                    key={attack.id}
                                    onClick={() => setSelectedAttack(attack.id)}
                                    className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                                        selectedAttack === attack.id
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                                    }`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${
                                        selectedAttack === attack.id ? 'bg-white' : 'bg-gray-600'
                                    }`} />
                                    <span className="text-sm font-medium">{attack.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Left Side - Attack Details */}
                    <div className="w-[55%] bg-gray-900 p-8 flex flex-col border-blue-400 border-t-3">
                        <div className="flex-1">
                            <div className="bg-gray-800 rounded-lg p-6 mb-6">
                                <h3 className="text-blue-400 text-xl font-bold mb-4 text-right">
                                    {selectedAttackData?.nameEn}
                                </h3>

                                <p className="text-gray-300 text-sm leading-relaxed mb-4 text-right">
                                    SQL injection (SQLi) is a web security vulnerability that allows an attacker to interfere with the queries that an application makes to its database.
                                </p>

                                <p className="text-gray-400 text-sm leading-relaxed text-right" dir="rtl">
                                    تزریق SQL یک آسیب‌پذیری امنیتی وب است که به مهاجم اجازه می‌دهد تا در پرس‌وجوهایی که یک برنامه به پایگاه داده خود انجام می‌دهد، دخالت کند.
                                </p>
                            </div>

                            <div className="bg-gray-800 rounded-lg p-6">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-gray-400 text-sm">احتمال موفقیت: ۵۰٪</span>
                                    <span className="text-white text-xl font-bold">SQL INJECTION</span>
                                </div>

                                <Progress value={successRate} className="h-2 bg-gray-700">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300 rounded-full"
                                        style={{ width: `${successRate}%` }}
                                    />
                                </Progress>

                                <div className="flex items-center gap-2 mt-3">
                                    <span className="text-blue-400 text-sm">امتیاز:</span>
                                    <span className="text-gray-300 text-sm font-medium">۵ ستاره</span>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <span className="text-yellow-500 text-xl">⚠</span>
                                    <p className="text-yellow-200 text-sm">
                                        آسیب پذیری:
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-800">
                                <Button
                                    onClick={() => setIsOpen(false)}
                                    variant="outline"
                                    className="flex-1 bg-gray-600 text-white hover:bg-gray-800 border-gray-700"
                                >
                                    بیخیال!
                                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-black text-white text-xs font-bold">B</div>
                                </Button>
                                <Button
                                    onClick={() => {
                                        console.log('Attack selected:', selectedAttackData);
                                        setIsOpen(false);
                                    }}
                                    className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    بعدی
                                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-black text-white text-xs font-bold">B</div>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SecurityAttackDialog;