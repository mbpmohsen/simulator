import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

// Use your exact interface
export interface Root {
    type: string;
    id: string;
    objects: ObjectItem[];
}

export interface ObjectItem {
    type: string;
    id: string;
    spec_version: string;
    x_mitre_attack_spec_version?: string;
    name?: string;
    x_mitre_version?: string;
    description?: string;
    created_by_ref?: string;
    created: string;
    modified?: string;
    x_mitre_contents?: XMitreContent[];
    object_marking_refs?: string[];
    name_fa?: string;
    description_fa?: string;
    external_references?: ExternalReference[];
    tactic_refs?: string[];
    x_mitre_modified_by_ref?: string;
    x_mitre_deprecated?: boolean;
    x_mitre_domains?: string[];
    revoked?: boolean;
    is_family?: boolean;
    x_mitre_platforms?: string[];
    x_mitre_aliases?: string[];
    x_mitre_contributors?: string[];
    x_mitre_shortname?: string;
    kill_chain_phases?: KillChainPhase[];
    x_mitre_detection?: string;
    x_mitre_is_subtechnique?: boolean;
    x_mitre_data_sources?: string[];
    x_mitre_impact_type?: string[];
    x_mitre_remote_support?: boolean;
    x_mitre_data_source_ref?: string;
    aliases?: string[];
    first_seen?: string;
    last_seen?: string;
    x_mitre_first_seen_citation?: string;
    x_mitre_last_seen_citation?: string;
    x_mitre_collection_layers?: string[];
    relationship_type?: string;
    source_ref?: string;
    target_ref?: string;
    identity_class?: string;
    definition?: Definition;
    definition_type?: string;
}

export interface XMitreContent {
    object_ref: string;
    object_modified: string;
}

export interface ExternalReference {
    source_name: string;
    description?: string;
    url?: string;
    external_id?: string;
}

export interface KillChainPhase {
    kill_chain_name: string;
    phase_name: string;
}

export interface Definition {
    statement: string;
}

// Cache
let attackData: Root | null = null;

async function initAttackData(): Promise<Root> {
    if (!attackData) {
        const filePath = path.join(process.cwd(), 'data/enterprise-attack-17.1-t.json');
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            attackData = JSON.parse(content) as Root;
            if (!attackData.objects || !Array.isArray(attackData.objects)) {
                throw new Error('Invalid STIX bundle: missing objects array');
            }
        } catch (err) {
            console.error('Failed to load JSON:', err);
            throw new Error(`Could not load or parse JSON file at ${filePath}`);
        }
    }
    return attackData;
}

// Helper: Get all intrusion-sets (groups)
function getGroups(data: Root): ObjectItem[] {
    return data.objects.filter(obj => obj.type === 'intrusion-set');
}

// Helper: Get all techniques (attack-pattern)
function getTechniques(data: Root): ObjectItem[] {
    return data.objects.filter(obj => obj.type === 'attack-pattern');
}

// Helper: Get all tactics (x-mitre-tactic)
function getTactics(data: Root): ObjectItem[] {
    return data.objects.filter(obj => obj.type === 'x-mitre-tactic');
}

// Helper: Get relationships where group uses technique
function getGroupTechniqueRelationships(data: Root, groupId: string): ObjectItem[] {
    return data.objects.filter(
        obj =>
            obj.type === 'relationship' &&
            obj.relationship_type === 'uses' &&
            obj.source_ref === groupId &&
            obj.target_ref?.startsWith('attack-pattern--')
    );
}

// Helper: Get tactic names from kill_chain_phases
function getTacticNames(data: Root, technique: ObjectItem): string[] {
    const tacticNames: string[] = [];
    technique.kill_chain_phases?.forEach(phase => {
        if (phase.kill_chain_name === 'mitre-attack') {
            const tactic = getTactics(data).find(t => t.x_mitre_shortname === phase.phase_name);
            if (tactic?.name) {
                tacticNames.push(tactic.name);
            }
        }
    });
    return tacticNames;
}

// API Route
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId'); // Full STIX ID like "intrusion-set--..."
    const lang = searchParams.get('lang') || 'en';
    const useFa = lang === 'fa';

    try {
        const data = await initAttackData();

        if (groupId) {
            // Find group by full `id` (e.g., "intrusion-set--abc123")
            const group = getGroups(data).find(g => g.id === groupId);
            if (!group) {
                return NextResponse.json({ error: 'Group not found' }, { status: 404 });
            }

            // Get techniques used by this group
            const relationships = getGroupTechniqueRelationships(data, group.id);
            const techniqueIds = relationships.map(r => r.target_ref!);
            const techniques = getTechniques(data).filter(t => techniqueIds.includes(t.id));

            // Get unique tactic names
            const allTacticNames = new Set<string>();
            techniques.forEach(tech => {
                getTacticNames(data, tech).forEach(name => allTacticNames.add(name));
            });

            return NextResponse.json({
                id: group.id,
                name: useFa ? (group.name_fa || group.name) : group.name,
                description: useFa ? (group.description_fa || group.description) : group.description,
                externalReferences: group.external_references,
                techniques: techniques.map(tech => ({
                    id: tech.id,
                    name: useFa ? (tech.name_fa || tech.name) : tech.name,
                    description: useFa ? (tech.description_fa || tech.description) : tech.description,
                })),
                tactics: Array.from(allTacticNames),
            });
        }

        // Return list of all groups
        const groups = getGroups(data).map(g => ({
            id: g.id, // Full STIX ID
            name: useFa ? (g.name_fa || g.name) : g.name,
        }));

        return NextResponse.json(groups);
    } catch (error) {
        console.error('ATT&CK API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}