import { GROUP_COLORS } from './colorGroups';

export function getGroupColor(name: string) {
  return GROUP_COLORS[name] || '#ccc';
}
