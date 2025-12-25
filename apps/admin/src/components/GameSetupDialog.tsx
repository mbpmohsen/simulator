import React, {FC, useState} from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { X, Plus, AlertCircle } from 'lucide-react';
import { useGameConfigStore } from "@/store/store";

const AVAILABLE_COLORS = [
    { name: 'آبی', value: 'blue', hex: '#3B82F6' },
    { name: 'قرمز', value: 'red', hex: '#EF4444' },
    { name: 'سبز', value: 'green', hex: '#10B981' },
    { name: 'زرد', value: 'yellow', hex: '#F59E0B' },
    { name: 'بنفش', value: 'purple', hex: '#A855F7' },
    { name: 'صورتی', value: 'pink', hex: '#EC4899' },
    { name: 'نارنجی', value: 'orange', hex: '#F97316' },
    { name: 'فیروزه‌ای', value: 'teal', hex: '#14B8A6' },
    { name: 'نیلی', value: 'indigo', hex: '#6366F1' },
    { name: 'آبی روشن', value: 'cyan', hex: '#06B6D4' },
];

interface SideWithColor {
    name: string;
    color: string;
    credits: number;
}

interface IProps {
    isOpen: boolean;
    onClose: () => void;
    handleNextStep: () => void;
}

const GameSetupDialog: FC<IProps> = ({ isOpen, onClose, handleNextStep }) => {
    const addSide = useGameConfigStore(state => state.addSide);
    const removeSide = useGameConfigStore(state => state.removeSide);
    const addTeam = useGameConfigStore(state => state.addTeam);
    const removeTeam = useGameConfigStore(state => state.removeTeam);
    const updateTeamSide = useGameConfigStore(state => state.updateTeamSide);
    const setNumTurns = useGameConfigStore(state => state.setNumTurns);
    const setPointThreshold = useGameConfigStore(state => state.setPointThreshold);
    const setMaxPlayers = useGameConfigStore(state => state.setMaxPlayers);
    const setSideCredit = useGameConfigStore(state => state.setSideCredit);
    const validateConfig = useGameConfigStore(state => state.validateConfig);

    // Zustand store state
    const sideNames = useGameConfigStore(state => state.config.side_names);
    const teamNames = useGameConfigStore(state => state.config.team_names);
    const sideAssignments = useGameConfigStore(state => state.config.side_assignments);
    const numTurns = useGameConfigStore(state => state.config.num_turns);
    const pointThreshold = useGameConfigStore(state => state.config.point_threshold);
    const sideCredits = useGameConfigStore(state => state.config.side_credits);
    const maxPlayers = useGameConfigStore(state => state.config.max_players);

    // Local state for side colors (not in main config, just for UI)
    const [sideColors, setSideColors] = useState<Record<string, string>>({
        'Red': 'red',
        'Blue': 'blue',
    });

    // Form state
    const [newSideName, setNewSideName] = useState('');
    const [newSideColor, setNewSideColor] = useState('');
    const [newSideCredits, setNewSideCredits] = useState(200);
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamSide, setNewTeamSide] = useState('');
    const [errors, setErrors] = useState<string[]>([]);

    // Build sides array with colors for UI
    const sides: SideWithColor[] = sideNames.map(name => ({
        name,
        color: sideColors[name] || 'gray',
        credits: sideCredits[name] || 200,
    }));

    // Build teams array for UI
    const teams = teamNames.map(name => ({
        name,
        side: sideAssignments[name] || '',
    }));

    const usedColors = Object.values(sideColors);
    const availableColors = AVAILABLE_COLORS.filter(c => !usedColors.includes(c.value));

    const handleAddSide = () => {
        if (!newSideName.trim()) {
            setErrors(['نام طرف نمی‌تواند خالی باشد']);
            return;
        }
        if (!newSideColor) {
            setErrors(['لطفاً یک رنگ انتخاب کنید']);
            return;
        }
        if (sideNames.some(s => s.toLowerCase() === newSideName.toLowerCase())) {
            setErrors(['نام طرف باید منحصر به فرد باشد']);
            return;
        }

        // Add to Zustand store (include initial credits)
        addSide(newSideName.trim(), newSideColor, newSideCredits);

        // Store color locally for UI
        setSideColors(prev => ({
            ...prev,
            [newSideName.trim()]: newSideColor,
        }));

        // Reset form
        setNewSideName('');
        setNewSideColor('');
        setNewSideCredits(200);
        setErrors([]);
    };

    const handleRemoveSide = (name: string) => {
        removeSide(name);
        setSideColors(prev => {
            const { [name]: _, ...rest } = prev;
            return rest;
        });
    };

    const handleAddTeam = () => {
        if (!newTeamName.trim()) {
            setErrors(['نام تیم نمی‌تواند خالی باشد']);
            return;
        }
        if (!newTeamSide) {
            setErrors(['لطفاً یک طرف انتخاب کنید']);
            return;
        }
        if (teamNames.some(t => t.toLowerCase() === newTeamName.toLowerCase())) {
            setErrors(['نام تیم باید منحصر به فرد باشد']);
            return;
        }

        addTeam(newTeamName.trim(), newTeamSide);

        setNewTeamName('');
        setNewTeamSide('');
        setErrors([]);
    };

    const handleSubmit = () => {
        const validation = validateConfig(0);

        if (!validation.isValid) {
            setErrors(validation.errors);
            return;
        }

        handleNextStep();
    };

    const getColorHex = (colorValue: string) => {
        return AVAILABLE_COLORS.find(c => c.value === colorValue)?.hex || '#666';
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl bg-gray-900 border-gray-700 p-0 gap-0 max-h-[90vh] overflow-hidden" dir="rtl">
                <DialogHeader className="px-6 py-4 border-b border-gray-700">
                    <DialogTitle className="text-white text-xl">تنظیمات بازی</DialogTitle>
                </DialogHeader>

                <div className="flex h-[600px] overflow-hidden">
                    {/* Right Panel - Sides */}
                    <div className="w-1/2 border-l border-gray-700 p-6 overflow-y-auto">
                        <h3 className="text-white text-lg font-semibold mb-4">تنظیمات طرف‌ها</h3>

                        {/* Add New Side */}
                        <div className="bg-gray-800 rounded-lg p-4 mb-4">
                            <Label className="text-gray-300 text-sm mb-2 block">افزودن طرف جدید</Label>
                            <div className="flex gap-2 mb-2">
                                <Input
                                    placeholder="نام طرف"
                                    value={newSideName}
                                    onChange={(e) => setNewSideName(e.target.value)}
                                    className="flex-1 bg-gray-700 border-gray-600 text-white"
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddSide()}
                                />
                                <Select value={newSideColor} onValueChange={setNewSideColor}>
                                    <SelectTrigger className="w-[140px] bg-gray-700 border-gray-600 text-white">
                                        <SelectValue placeholder="رنگ" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700">
                                        {availableColors.map((color) => (
                                            <SelectItem key={color.value} value={color.value} className="text-white">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-4 h-4 rounded-full border border-gray-600"
                                                        style={{ backgroundColor: color.hex }}
                                                    />
                                                    {color.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="mb-2">
                                <Input
                                    type="number"
                                    placeholder="اعتبار اولیه"
                                    value={newSideCredits}
                                    onChange={(e) => setNewSideCredits(parseFloat(e.target.value) || 200)}
                                    className="flex-1 bg-gray-700 border-gray-600 text-white"
                                />
                            </div>

                            <Button onClick={handleAddSide} size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                                <Plus className="w-4 h-4 ml-2" />
                                افزودن طرف
                            </Button>
                        </div>

                        {/* Sides List */}
                        <div className="space-y-2">
                            {sides.map((side) => (
                                <div
                                    key={side.name}
                                    className="flex items-center justify-between bg-gray-800 rounded-lg p-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-6 h-6 rounded-full border-2 border-gray-600"
                                            style={{ backgroundColor: getColorHex(side.color) }}
                                        />
                                        <div>
                                            <span className="text-white font-medium block">{side.name}</span>
                                            <span className="text-gray-400 text-xs">اعتبار: {side.credits}</span>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => handleRemoveSide(side.name)}
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {/* Game Settings */}
                        <div className="mt-6 space-y-4">
                            <div className="bg-gray-800 rounded-lg p-4">
                                <Label className="text-gray-300 text-sm mb-2 block">تعداد نوبت‌ها</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={numTurns}
                                    onChange={(e) => setNumTurns(parseInt(e.target.value) || 1)}
                                    className="bg-gray-700 border-gray-600 text-white"
                                />
                            </div>

                            <div className="bg-gray-800 rounded-lg p-4">
                                <Label className="text-gray-300 text-sm mb-2 block">حد آستانه امتیاز</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={pointThreshold}
                                    onChange={(e) => setPointThreshold(parseInt(e.target.value) || 1)}
                                    className="bg-gray-700 border-gray-600 text-white"
                                />
                            </div>
                            <div className="bg-gray-800 rounded-lg p-4">
                                <Label className="text-gray-300 text-sm mb-2 block">حداکثر نفرات تیم</Label>
                                <Input
                                    type="number"
                                    min="2"
                                    value={maxPlayers}
                                    onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 2)}
                                    className="bg-gray-700 border-gray-600 text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Left Panel - Teams */}
                    <div className="w-1/2 p-6 overflow-y-auto">
                        <h3 className="text-white text-lg font-semibold mb-4">تنظیمات تیم‌ها</h3>

                        {/* Add New Team */}
                        <div className="bg-gray-800 rounded-lg p-4 mb-4">
                            <Label className="text-gray-300 text-sm mb-2 block">افزودن تیم جدید</Label>
                            <div className="flex gap-2 mb-2">
                                <Input
                                    placeholder="نام تیم"
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    className="flex-1 bg-gray-700 border-gray-600 text-white"
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddTeam()}
                                />
                                <Select value={newTeamSide} onValueChange={setNewTeamSide}>
                                    <SelectTrigger className="w-[140px] bg-gray-700 border-gray-600 text-white">
                                        <SelectValue placeholder="طرف" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700">
                                        {sides.map((side) => (
                                            <SelectItem key={side.name} value={side.name} className="text-white">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-4 h-4 rounded-full border border-gray-600"
                                                        style={{ backgroundColor: getColorHex(side.color) }}
                                                    />
                                                    {side.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                onClick={handleAddTeam}
                                size="sm"
                                className="w-full bg-green-600 hover:bg-green-700"
                                disabled={sides.length === 0}
                            >
                                <Plus className="w-4 h-4 ml-2" />
                                افزودن تیم
                            </Button>
                        </div>

                        {/* Teams List */}
                        <div className="space-y-2">
                            {teams.map((team) => (
                                <div
                                    key={team.name}
                                    className="flex items-center justify-between bg-gray-800 rounded-lg p-3"
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <div
                                            className="w-6 h-6 rounded-full border-2 border-gray-600"
                                            style={{
                                                backgroundColor: getColorHex(
                                                    sideColors[team.side] || 'gray'
                                                )
                                            }}
                                        />
                                        <span className="text-white font-medium">{team.name}</span>
                                        <span className="text-gray-400 text-sm">← {team.side}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={team.side}
                                            onValueChange={(val) => updateTeamSide(team.name, val)}
                                        >
                                            <SelectTrigger className="w-[120px] h-8 bg-gray-700 border-gray-600 text-white text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-gray-800 border-gray-700">
                                                {sides.map((side) => (
                                                    <SelectItem key={side.name} value={side.name} className="text-white">
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="w-3 h-3 rounded-full border border-gray-600"
                                                                style={{ backgroundColor: getColorHex(side.color) }}
                                                            />
                                                            {side.name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            onClick={() => removeTeam(team.name)}
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Errors */}
                {errors.length > 0 && (
                    <div className="px-6 py-3 bg-red-900/20 border-t border-red-700">
                        {errors.map((error, i) => (
                            <div key={i.toString()} className="flex items-center gap-2 text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-gray-700 bg-gray-800">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="flex-1 bg-gray-700 text-white hover:bg-gray-600 border-gray-600"
                    >
                        انصراف
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                    >
                        ایجاد تنظیمات بازی
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default GameSetupDialog;
