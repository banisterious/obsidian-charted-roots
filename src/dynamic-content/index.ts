/**
 * Dynamic Content Module
 *
 * Provides code block processors for rendering live, computed content
 * within person notes.
 */

export { DynamicContentService } from './services/dynamic-content-service';
export type { DynamicBlockConfig, DynamicBlockContext, DynamicBlockType } from './services/dynamic-content-service';

export { TimelineProcessor } from './processors/timeline-processor';
export { TimelineRenderer } from './renderers/timeline-renderer';

export { RelationshipsProcessor } from './processors/relationships-processor';
export { RelationshipsRenderer } from './renderers/relationships-renderer';

export { MediaProcessor } from './processors/media-processor';
export { MediaRenderer } from './renderers/media-renderer';

export { SourceRolesProcessor } from './processors/source-roles-processor';
export { SourceRolesRenderer } from './renderers/source-roles-renderer';

export { TransfersProcessor } from './processors/transfers-processor';
export { TransfersRenderer } from './renderers/transfers-renderer';

export { MembersProcessor } from './processors/members-processor';
export { MembersRenderer } from './renderers/members-renderer';

export { SourcesProcessor } from './processors/sources-processor';
export { SourcesRenderer } from './renderers/sources-renderer';

export { ExtractionsProcessor } from './processors/extractions-processor';
export { ExtractionsRenderer } from './renderers/extractions-renderer';

export { NegativeFindingsProcessor } from './processors/negative-findings-processor';
export { NegativeFindingsRenderer } from './renderers/negative-findings-renderer';

export { ResearchTimelineProcessor } from './processors/research-timeline-processor';
export { ResearchTimelineRenderer } from './renderers/research-timeline-renderer';

export { UniverseEntitiesProcessor } from './processors/universe-entities-processor';
export { UniverseEntitiesRenderer } from './renderers/universe-entities-renderer';

export { UniverseMapsProcessor } from './processors/universe-maps-processor';
export { UniverseMapsRenderer } from './renderers/universe-maps-renderer';
