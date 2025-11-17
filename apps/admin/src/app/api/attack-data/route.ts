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
    x_mitre_detection_fa?: string;
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
    source_name_fa?: string;
    description?: string;
    description_fa?: string;
    url?: string;
    external_id?: string;
}

export interface KillChainPhase {
    kill_chain_name: string;
    phase_name: string;
}

export interface Definition {
    statement: string;
    statement_fa?: string;
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

// Helper: Localize external references
function localizeExternalReferences(refs: ExternalReference[] | undefined, useFa: boolean): ExternalReference[] | undefined {
    if (!refs) return refs;

    return refs.map(ref => ({
        ...ref,
        source_name: useFa ? (ref.source_name_fa || ref.source_name) : ref.source_name,
        description: useFa && ref.description ? (ref.description_fa || ref.description) : ref.description,
    }));
}

// Helper: Localize definition
function localizeDefinition(def: Definition | undefined, useFa: boolean): Definition | undefined {
    if (!def) return def;

    return {
        ...def,
        statement: useFa ? (def.statement_fa || def.statement) : def.statement,
    };
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

// Helper: Get all mitigations (course-of-action)
function getMitigations(data: Root): ObjectItem[] {
    return data.objects.filter(obj => obj.type === 'course-of-action');
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

// Helper: Get relationships where technique is mitigated by mitigation
function getTechniqueMitigationRelationships(data: Root, techniqueId: string): ObjectItem[] {
    return data.objects.filter(
        obj =>
            obj.type === 'relationship' &&
            obj.relationship_type === 'mitigates' &&
            obj.target_ref === techniqueId &&
            obj.source_ref?.startsWith('course-of-action--')
    );
}

// Helper: Get tactic names from kill_chain_phases
function getTacticNames(data: Root, technique: ObjectItem, useFa: boolean): string[] {
    const tacticNames: string[] = [];
    technique.kill_chain_phases?.forEach(phase => {
        if (phase.kill_chain_name === 'mitre-attack') {
            const tactic = getTactics(data).find(t => t.x_mitre_shortname === phase.phase_name);
            if (tactic) {
                const name = useFa ? (tactic.name_fa || tactic.name) : tactic.name;
                if (name) tacticNames.push(name);
            }
        }
    });
    return tacticNames;
}

// API Route
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId'); // Full STIX ID like "intrusion-set--..."
    const techniqueId = searchParams.get('techniqueId'); // Full STIX ID like "attack-pattern--..."
    const tacticId = searchParams.get('tacticId'); // Full STIX ID like "x-mitre-tactic--..."
    const lang = searchParams.get('lang') || 'en';
    const useFa = lang === 'fa';

    try {
        const data = await initAttackData();

        // Get specific technique details
        if (techniqueId) {
            const technique = getTechniques(data).find(t => t.id === techniqueId);
            if (!technique) {
                return NextResponse.json({ error: 'Technique not found' }, { status: 404 });
            }

            // Get mitigations for this technique
            const mitigationRelationships = getTechniqueMitigationRelationships(data, technique.id);
            const mitigationIds = mitigationRelationships.map(r => r.source_ref!);
            const mitigations = getMitigations(data).filter(m => mitigationIds.includes(m.id));

            return NextResponse.json({
                id: technique.id,
                name: useFa ? (technique.name_fa || technique.name) : technique.name,
                description: useFa ? (technique.description_fa || technique.description) : technique.description,
                detection: useFa ? (technique.x_mitre_detection_fa || technique.x_mitre_detection) : technique.x_mitre_detection,
                platforms: technique.x_mitre_platforms,
                dataSources: technique.x_mitre_data_sources,
                isSubtechnique: technique.x_mitre_is_subtechnique,
                externalReferences: localizeExternalReferences(technique.external_references, useFa),
                tactics: getTacticNames(data, technique, useFa),
                mitigations: mitigations.map(m => ({
                    id: m.id,
                    name: useFa ? (m.name_fa || m.name) : m.name,
                    description: useFa ? (m.description_fa || m.description) : m.description,
                    externalReferences: localizeExternalReferences(m.external_references, useFa),
                })),
            });
        }

        // Get specific tactic details
        if (tacticId) {
            const tactic = getTactics(data).find(t => t.id === tacticId);
            if (!tactic) {
                return NextResponse.json({ error: 'Tactic not found' }, { status: 404 });
            }

            // Get all techniques that belong to this tactic
            const techniques = getTechniques(data).filter(tech =>
                tech.kill_chain_phases?.some(
                    phase => phase.kill_chain_name === 'mitre-attack' &&
                        phase.phase_name === tactic.x_mitre_shortname
                )
            );

            return NextResponse.json({
                id: tactic.id,
                name: useFa ? (tactic.name_fa || tactic.name) : tactic.name,
                description: useFa ? (tactic.description_fa || tactic.description) : tactic.description,
                shortname: tactic.x_mitre_shortname,
                externalReferences: localizeExternalReferences(tactic.external_references, useFa),
                techniques: techniques.map(tech => ({
                    id: tech.id,
                    name: useFa ? (tech.name_fa || tech.name) : tech.name,
                    description: useFa ? (tech.description_fa || tech.description) : tech.description,
                    isSubtechnique: tech.x_mitre_is_subtechnique,
                })),
            });
        }

        // Get specific group details
        if (groupId) {
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
                getTacticNames(data, tech, useFa).forEach(name => allTacticNames.add(name));
            });

            return NextResponse.json({
                id: group.id,
                name: useFa ? (group.name_fa || group.name) : group.name,
                description: useFa ? (group.description_fa || group.description) : group.description,
                aliases: group.x_mitre_aliases,
                externalReferences: localizeExternalReferences(group.external_references, useFa),
                techniques: techniques.map(tech => ({
                    id: tech.id,
                    name: useFa ? (tech.name_fa || tech.name) : tech.name,
                    description: useFa ? (tech.description_fa || tech.description) : tech.description,
                    tactics: getTacticNames(data, tech, useFa),
                })),
                tactics: Array.from(allTacticNames),
            });
        }

        // Return list of all groups (default endpoint)
        const groups = getGroups(data).map(g => ({
            id: g.id,
            name: useFa ? (g.name_fa || g.name) : g.name,
            aliases: g.x_mitre_aliases,
        }));

        return NextResponse.json(groups);
    } catch (error) {
        console.error('ATT&CK API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}