'use client';

import { useState, useEffect } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@workspace/ui/components/accordion';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';

// Types
type Language = 'en' | 'fa';

interface Technique {
    id: string;
    name: string;
    description: string;
}

interface Group {
    id: string;
    name: string;
    description: string;
    techniques: Technique[];
    tactics: string[];
}

// Custom Hooks
const useGroups = (language: Language) => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const res = await fetch(`/api/attack-data?lang=${language}`);
                if (!res.ok) throw new Error('Failed to fetch groups');
                const data = await res.json();
                setGroups(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
                console.error('Error fetching groups:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchGroups();
    }, [language]);

    return { groups, isLoading, error };
};

const useGroupDetails = () => {
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchGroupDetails = async (groupId: string, language: Language) => {
        try {
            setIsLoading(true);
            setError(null);
            setSelectedGroup(null);

            const res = await fetch(`/api/attack-data?groupId=${groupId}&lang=${language}`);
            if (!res.ok) throw new Error('Failed to fetch group details');
            const data = await res.json();
            setSelectedGroup(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Error fetching group details:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const clearSelection = () => {
        setSelectedGroup(null);
        setError(null);
    };

    return { selectedGroup, isLoading, error, fetchGroupDetails, clearSelection };
};

// Components
const LanguageSelector = ({
                              language,
                              onLanguageChange
                          }: {
    language: Language;
    onLanguageChange: (value: Language) => void;
}) => (
    <Select value={language} onValueChange={onLanguageChange}>
        <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="fa">فارسی (Persian)</SelectItem>
            <SelectItem value="en">English</SelectItem>
        </SelectContent>
    </Select>
);

const GroupsList = ({
                        groups,
                        isLoading,
                        onSelectGroup
                    }: {
    groups: Group[];
    isLoading: boolean;
    onSelectGroup: (groupId: string) => void;
}) => {
    if (isLoading) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                ))}
            </div>
        );
    }

    return (
        <ScrollArea className="h-[300px] w-full rounded-md border p-4">
            <div className="space-y-2">
                {groups.map((group) => (
                    <Button
                        key={group.id}
                        variant="outline"
                        className="w-full justify-start text-right"
                        onClick={() => onSelectGroup(group.id)}
                    >
                        {group.name}
                    </Button>
                ))}
            </div>
        </ScrollArea>
    );
};

const TechniquesTab = ({ techniques }: { techniques: Technique[] }) => (
    <Accordion type="single" collapsible className="w-full">
        {techniques.map((technique, index) => (
            <AccordionItem key={technique.id} value={`item-${index}`}>
                <AccordionTrigger className="text-right">
                    {technique.name}
                </AccordionTrigger>
                <AccordionContent>
                    <div
                        className="prose prose-invert max-w-none"
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
                        dangerouslySetInnerHTML={{ __html: technique.description }}
                    />
                    <Button variant="secondary" size="sm" className="mt-2">
                        استفاده از این تکنیک (Use Technique)
                    </Button>
                </AccordionContent>
            </AccordionItem>
        ))}
    </Accordion>
);

const TacticsTab = ({ tactics }: { tactics: string[] }) => (
    <ul className="list-disc space-y-2 pr-4">
        {tactics.map((tactic, index) => (
            <li key={index}>{tactic}</li>
        ))}
    </ul>
);

const GroupDetailsTabs = ({ group }: { group: Group }) => (
    <Tabs defaultValue="techniques" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="techniques">تکنیک‌ها (Techniques)</TabsTrigger>
            <TabsTrigger value="tactics">تاکتیک‌ها (Tactics)</TabsTrigger>
        </TabsList>
        <TabsContent value="techniques">
            <TechniquesTab techniques={group.techniques} />
        </TabsContent>
        <TabsContent value="tactics">
            <TacticsTab tactics={group.tactics} />
        </TabsContent>
    </Tabs>
);

const GroupDetailsSkeleton = () => (
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
);

const GroupDetails = ({
                          group,
                          isLoading
                      }: {
    group: Group | null;
    isLoading: boolean;
}) => {
    if (isLoading) return <GroupDetailsSkeleton />;

    if (!group) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{group.name}</CardTitle>
                <CardDescription
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
                    dangerouslySetInnerHTML={{ __html: group.description }}
                />
            </CardHeader>
            <CardContent>
                <GroupDetailsTabs group={group} />
            </CardContent>
        </Card>
    );
};

// Main Component
export default function Game() {
    const [language, setLanguage] = useState<Language>('fa');

    const { groups, isLoading: isLoadingGroups, error: groupsError } = useGroups(language);
    const { selectedGroup, isLoading: isLoadingDetails, fetchGroupDetails, clearSelection } = useGroupDetails();

    const handleLanguageChange = (value: Language) => {
        setLanguage(value);
        clearSelection();
    };

    const handleSelectGroup = (groupId: string) => {
        fetchGroupDetails(groupId, language);
    };

    return (
        <div dir={language === 'fa' ? 'rtl' : 'ltr'} className="min-h-screen bg-background p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header with Language Toggle */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>انتخاب گروه (Group Selection)</CardTitle>
                            <LanguageSelector
                                language={language}
                                onLanguageChange={handleLanguageChange}
                            />
                        </div>
                    </CardHeader>
                </Card>

                {/* Error Display */}
                {groupsError && (
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="pt-6">
                            <p className="text-red-800">Error: {groupsError}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Groups List */}
                <Card>
                    <CardHeader>
                        <CardTitle>لیست گروه‌ها (Groups List)</CardTitle>
                        <CardDescription>
                            یک گروه را برای مشاهده جزئیات انتخاب کنید.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <GroupsList
                            groups={groups}
                            isLoading={isLoadingGroups}
                            onSelectGroup={handleSelectGroup}
                        />
                    </CardContent>
                </Card>

                {/* Selected Group Details */}
                <GroupDetails
                    group={selectedGroup}
                    isLoading={isLoadingDetails}
                />
            </div>
        </div>
    );
}