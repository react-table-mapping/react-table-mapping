import type { TableMappingStore } from '@/core/store/createTableMappingStore';

/**
 * svg line type
 * - default value is `straight`
 */
export type LineType = 'bezier' | 'straight' | 'step';

/**
 * source column type
 */
export interface HeaderColumnProps {
  /**
   * column title
   */
  title: string;

  /**
   * column key
   * - matched with `FieldItem.key`
   * - if you want to match with `FieldItem.key`, use `key` props.
   * - can use `sameNameMapping` methods in `useTableMapping` hook.
   */
  key: string;
}

/**
 * other field data
 * - you can custom field component init.
 * - if you want to match with `HeaderColumnProps.key`, use `columnKey` props.
 *
 * `column key`
 * - matched with `FieldItem.key`
 * - if you want to match with `FieldItem.key`, use `key` props.
 * - can use `sameNameMapping` methods in `useTableMapping` hook.
 */
export interface OuterFieldItem {
  [field: string]:
    | {
        type: 'string';
        columnKey: string;
        value: string;
      }
    | {
        type: 'input';
        columnKey: string;
        value?: string;
        defaultValue?: string;
        attributes?: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>;
        onChange?: (value: string) => void;
      }
    | {
        type: 'select';
        columnKey: string;
        value?: string;
        defaultValue?: string;
        attributes?: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'>;
        options: {
          label: string;
          value: string;
          disabled?: boolean;
        }[];
        onChange?: (value: string) => void;
      }
    | string;
}

/**
 * field item type for `source` and `target`
 */
export interface FieldItem extends Partial<OuterFieldItem> {
  /**
   * field array item key value
   * - `source`: `source-${randomID}`
   * - `target`: `target-${randomID}`
   */
  id: string;

  /**
   * key
   * - matched with `HeaderColumnProps.key`
   */
  key: string;
}

/**
 * mapping array item key value
 */
export interface Mapping {
  /**
   * mapping array key value
   * - `id`: `mapping-${source.id}-${target.id}`
   */
  id: string;

  /**
   * source field id
   */
  source: string;

  /**
   * target field id
   */
  target: string;
}

/**
 * field item without internal properties (for user input)
 */
export type FieldItemInput = Partial<FieldItem>;

/**
 * A field being handed to `appendSource` / `appendTarget`.
 *
 * The `id` is optional there and only there: leave it out and one is generated, prefixed with
 * the side the field is being added to. Everything else a field needs is still required, since
 * nothing else is filled in for you.
 */
export interface FieldItemDraft extends Partial<OuterFieldItem> {
  id?: string;
  key: string;
}

/**
 * State change callback type
 */
export interface TableMappingState {
  sources: FieldItemInput[];
  targets: FieldItemInput[];
  mappings: Mapping[];
}

/**
 * Action types for state changes
 */
export type TableMappingActionType =
  | 'ADD_MAPPING'
  | 'REMOVE_MAPPING'
  | 'CLEAR_MAPPINGS'
  | 'UPDATE_MAPPINGS'
  | 'SAME_LINE_MAPPING'
  | 'SAME_NAME_MAPPING'
  | 'APPEND_SOURCE'
  | 'REMOVE_SOURCE'
  | 'UPDATE_SOURCE_FIELDS'
  | 'UPDATE_SOURCE_FIELD_VALUE'
  | 'APPEND_TARGET'
  | 'REMOVE_TARGET'
  | 'UPDATE_TARGET_FIELDS'
  | 'UPDATE_TARGET_FIELD_VALUE';

/**
 * Notify Action types - 모든 액션을 유니온으로 정의
 */
export type NotifyAction =
  | {
      type: 'ADD_MAPPING';
      payload: {
        sourceId: string;
        targetId: string;
        mapping: Mapping;
      };
    }
  | {
      type: 'REMOVE_MAPPING';
      payload: {
        mappingId: string;
        removedMapping: Mapping | undefined;
      };
    }
  | {
      type: 'CLEAR_MAPPINGS';
      payload: {
        clearedMappings: Mapping[];
      };
    }
  | {
      type: 'UPDATE_MAPPINGS';
      payload: {
        previousMappings: Mapping[];
        newMappings: Mapping[];
      };
    }
  | {
      type: 'SAME_LINE_MAPPING';
      payload: {
        previousMappings: Mapping[];
        newMappings: Mapping[];
      };
    }
  | {
      type: 'SAME_NAME_MAPPING';
      payload: {
        name: string;
        previousMappings: Mapping[];
        newMappings: Mapping[];
      };
    }
  | {
      type: 'APPEND_SOURCE';
      payload: {
        source: FieldItem;
      };
    }
  | {
      type: 'REMOVE_SOURCE';
      payload: {
        sourceId: string;
        removedMappings: Mapping[];
      };
    }
  | {
      type: 'UPDATE_SOURCE_FIELDS';
      payload: {
        previousSources: FieldItem[];
        newSources: FieldItem[];
      };
    }
  | {
      type: 'UPDATE_SOURCE_FIELD_VALUE';
      payload: {
        sourceId: string;
        fieldKey: string;
        newValue: string;
      };
    }
  | {
      type: 'APPEND_TARGET';
      payload: {
        target: FieldItem;
      };
    }
  | {
      type: 'REMOVE_TARGET';
      payload: {
        targetId: string;
        removedMappings: Mapping[];
      };
    }
  | {
      type: 'UPDATE_TARGET_FIELDS';
      payload: {
        previousTargets: FieldItem[];
        newTargets: FieldItem[];
      };
    }
  | {
      type: 'UPDATE_TARGET_FIELD_VALUE';
      payload: {
        targetId: string;
        fieldKey: string;
        newValue: string;
      };
    };

/**
 * State change action
 */

/**
 * State change callback type with action
 */
export interface TableMappingStateWithAction extends TableMappingState {
  action: NotifyAction;
}

/**
 * What `ref` gives you: the component's data as it stands, plus every mutation you can drive
 * from outside it.
 *
 * Written out rather than inferred from the hook behind it. While it was inferred, editing that
 * hook changed this published type without anything saying so — a parameter widened there
 * arrived in a consumer's editor with no decision having been made about it.
 */
export interface TableMappingRef {
  /** The source rows as they stand. Re-read after a mutation rather than held onto. */
  sourceFields: FieldItem[];
  /** The target rows as they stand. */
  targetFields: FieldItem[];
  /** The mappings as they stand. */
  mappings: Mapping[];
  /** How many times {@link redraw} has been called. Only ever increases. */
  redrawCount: number;

  /** Reads the current rows and mappings without waiting for a render. */
  getSourceFields: () => FieldItem[];
  getTargetFields: () => FieldItem[];
  getMappings: () => Mapping[];

  addMapping: (sourceId: string, targetId: string) => void;
  removeMapping: (mappingId: string) => void;
  clearMappings: () => void;
  updateMappings: (next: Mapping[]) => void;
  /** Pairs rows by position, stopping at whichever table is shorter. */
  sameLineMapping: () => void;
  /** Pairs rows whose value in the given column matches. Replaces any existing mappings. */
  sameNameMapping: (name: string) => void;

  /** Adds a row to the end. Leave the `id` out and one is generated. */
  appendSource: (source: FieldItemDraft) => void;
  /** Removes the row and any mappings that referenced it. */
  removeSource: (sourceId: string) => void;
  /** Replaces the whole list. Unlike {@link removeSource}, leaves mappings alone. */
  updateSourceFields: (next: FieldItem[]) => void;
  updateSourceFieldValue: (sourceId: string, fieldKey: string, newValue: string) => void;

  appendTarget: (target: FieldItemDraft) => void;
  removeTarget: (targetId: string) => void;
  updateTargetFields: (next: FieldItem[]) => void;
  updateTargetFieldValue: (targetId: string, fieldKey: string, newValue: string) => void;

  /** Re-measures every line. For a move no observer can see — see the JSDoc on the hook. */
  redraw: () => void;

  /** @internal Reachable, but not part of what this package supports. */
  _store: TableMappingStore;
}

export interface TableMappingProps {
  ref?: React.RefObject<TableMappingRef | null>;

  // ============ Controlled Props ============
  /**
   * Controlled source fields
   */
  sources?: FieldItemInput[];

  /**
   * Controlled target fields
   */
  targets?: FieldItemInput[];

  /**
   * Controlled mappings
   */
  mappings?: Mapping[];

  // ============ Common Props ============
  /**
   * source column array item
   */
  sourceColumns: Array<Omit<HeaderColumnProps, 'type'>>;

  /**
   * target column array item
   */
  targetColumns: Array<Omit<HeaderColumnProps, 'type'>>;

  /**
   * - default value is `straight`
   */
  lineType?: LineType;

  /**
   * mapping line color
   * - default value is `#009bff`
   */
  lineColor?: string;

  /**
   * mapping line width
   * - default value is `1.7`
   */
  lineWidth?: number;

  /**
   * mapping line hover color
   * - default value is `#e3f3ff`
   */
  hoverLineColor?: string;

  /**
   * disabled mapping and contents
   */
  disabled?: boolean;

  /**
   * no data component
   * - you can custom no data component.
   */
  noDataComponent?: React.ReactNode;

  // ============ Event Callbacks ============
  /**
   * before source field remove
   * @param sourceId
   */
  onBeforeSourceFieldRemove?: (sourceId: string) => void | boolean;

  /**
   * before target field remove
   * @param targetId
   */
  onBeforeTargetFieldRemove?: (targetId: string) => void | boolean;

  /**
   * after source field remove
   * @params removeSourceId
   */
  onAfterSourceFieldRemove?: (removedSourceId: string) => void;

  /**
   * after target field remove
   * @params removeTargetId
   */
  onAfterTargetFieldRemove?: (removedTargetId: string) => void;

  /**
   * after mapping line remove
   * @param removeMappingId
   */
  onAfterMappingLineRemove?: (removeMappingId: string) => void;

  /**
   * before mapping line remove
   * @param removeMappingId
   */
  onBeforeMappingLineRemove?: (removeMappingId: string) => void | boolean;

  /**
   * after mapping change
   * @param sources
   * @param targets
   * @param mappings
   */
  onAfterMappingChange?: (state: TableMappingState) => void;

  /**
   * Main state change callback - called whenever internal state changes
   *
   * For Controlled components: Use this to update your external state
   * For Uncontrolled components: Use this to listen to state changes
   *
   * @param stateWithAction Current state with action information
   */
  onMappingChange?: (stateWithAction: TableMappingStateWithAction) => void;
}
