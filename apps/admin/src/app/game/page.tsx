'use client';

import { useState, useEffect } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@workspace/ui/components/accordion';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';

export default function Game() {
    const [groups, setGroups] = useState<any[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<any>(null);
    const [isLoadingGroups, setIsLoadingGroups] = useState(true);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [language, setLanguage] = useState<'en' | 'fa'>('fa'); // Default to Persian

    useEffect(() => {
        setIsLoadingGroups(true);
        fetch(`/api/attack-data?lang=${language}`)
            .then((res) => res.json())
            .then((data) => {
                setGroups(data);
                setIsLoadingGroups(false);
            })
            .catch((error) => {
                console.error('Error fetching groups:', error);
                setIsLoadingGroups(false);
            });
    }, [language]);

    const handleSelectGroup = async (groupId: string) => {
        setIsLoadingDetails(true);
        setSelectedGroup(null); // Clear previous selection
        try {
            const res = await fetch(`/api/attack-data?groupId=${groupId}&lang=${language}`);
            const data = await res.json();
            setSelectedGroup(data);
        } catch (error) {
            console.error('Error fetching group details:', error);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleLanguageChange = (value: 'en' | 'fa') => {
        setLanguage(value);
        setSelectedGroup(null); // Reset selection on language change
    };

    return (
        <div dir={language === 'fa' ? 'rtl' : 'ltr'} className="min-h-screen bg-background p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header with Language Toggle */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>انتخاب گروه (Group Selection)</CardTitle>
                            <Select value={language} onValueChange={handleLanguageChange}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fa">فارسی (Persian)</SelectItem>
                                    <SelectItem value="en">English</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                </Card>

                {/* Groups List */}
                <Card>
                    <CardHeader>
                        <CardTitle>لیست گروه‌ها (Groups List)</CardTitle>
                        <CardDescription>یک گروه را برای مشاهده جزئیات انتخاب کنید.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingGroups ? (
                            <div className="space-y-2">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} className="h-10 w-full" />
                                ))}
                            </div>
                        ) : (
                            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                                <div className="space-y-2">
                                    {groups.map((g: any) => (
                                        <Button
                                            key={g.id}
                                            variant="outline"
                                            className="w-full justify-start text-right"
                                            onClick={() => handleSelectGroup(g.id)}
                                        >
                                            {g.name}
                                        </Button>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>

                {/* Selected Group Details */}
                {isLoadingDetails ? (
                    <Card>
                        <CardContent className="space-y-4 pt-6">
                            <Skeleton className="h-8 w-1/3" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-6 w-1/4" />
                            <div className="space-y-2">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-10 w-full" />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    selectedGroup && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{selectedGroup.name}</CardTitle>
                                <CardDescription
                                    dangerouslySetInnerHTML={{ __html: selectedGroup.description }}
                                />
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="techniques" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="techniques">تکنیک‌ها (Techniques)</TabsTrigger>
                                        <TabsTrigger value="tactics">تاکتیک‌ها (Tactics)</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="techniques">
                                        <Accordion type="single" collapsible className="w-full">
                                            {selectedGroup.techniques.map((tech: any, index: number) => (
                                                <AccordionItem key={tech.id} value={`item-${index}`}>
                                                    <AccordionTrigger className="text-right">{tech.name}</AccordionTrigger>
                                                    <AccordionContent>
                                                        <div
                                                            className="prose prose-invert max-w-none"
                                                            dangerouslySetInnerHTML={{ __html: tech.description }}
                                                        />
                                                        <Button variant="secondary" size="sm" className="mt-2">
                                                            استفاده از این تکنیک (Use Technique)
                                                        </Button>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    </TabsContent>
                                    <TabsContent value="tactics">
                                        <ul className="list-disc space-y-2 pr-4">
                                            {selectedGroup.tactics.map((tac: string, index: number) => (
                                                <li key={index}>{tac}</li>
                                            ))}
                                        </ul>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    )
                )}
            </div>
        </div>
    );
}