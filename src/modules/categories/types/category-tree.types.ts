export interface CategoryTreeNode {
  id: number;
  name: string;
  description?: string;
  level: number;
  children?: CategoryTreeNode[];
  parentId?: number | null;
}

export interface CategoryBreadcrumb {
  id: number;
  name: string;
  level: number;
}

export interface CategoryStats {
  id: number;
  name: string;
  productCount: number;
  childrenCount: number;
}

export interface CategoryWithStats extends CategoryTreeNode {
  stats: CategoryStats;
}