import { useRbac } from '../providers/rbac-provider';

type Action = 'create' | 'read' | 'update' | 'delete';

export function usePermission(
  module: string,
  entity: string,
  action: Action,
): boolean {
  const { hasPermission } = useRbac();
  return hasPermission(module, entity, action);
}

export function useFieldPermission(
  module: string,
  entity: string,
  field: string,
): { visible: boolean; editable: boolean } {
  const { getFieldPermission } = useRbac();
  return getFieldPermission(module, entity, field);
}
