export const ROLE_HIERARCHY: Record<string, number> = {
    'admin': 4,
    'manager': 3,
    'warehouse_staff': 2,
    'sales_representative': 1,
};

export const ROLE_NAMES: Record<string, string> = {
    'admin': 'Administrator',
    'manager': 'Warehouse Manager',
    'warehouse_staff': 'Warehouse Staff',
    'sales_representative': 'Sales Representative',
};

export function getAvailableRoles(maxRole: string): string[] {
    const maxLevel = ROLE_HIERARCHY[maxRole] || 1;
    return Object.keys(ROLE_HIERARCHY).filter(
        (role) => ROLE_HIERARCHY[role] <= maxLevel
    );
}

export function normalizeRole(dbRoleName: string | null | undefined): string {
    if (!dbRoleName) return 'sales_representative';

    if (dbRoleName === 'Administrator') return 'admin';
    if (dbRoleName === 'Warehouse Manager') return 'manager';
    // Map Procurement Officer to Warehouse Staff historically if encountered
    if (dbRoleName === 'Procurement Officer') return 'warehouse_staff';

    // Normalization
    const normalized = dbRoleName.toLowerCase().replace(/ /g, '_');

    // Fallback for old procurement_officer enum if still present in data
    if (normalized === 'procurement_officer') return 'warehouse_staff';

    return normalized;
}
export async function getServerRole(supabase: any, userId: string): Promise<string> {
    // 1. Get employee ID mapping
    const { data: urData } = await supabase.from('user_roles').select('emp_id').eq('user_id', userId).maybeSingle();
    const empId = urData?.emp_id;

    let empData = null;
    if (empId) {
        const { data: e } = await supabase.from('employees').select('role_id').eq('e_id', empId).maybeSingle();
        empData = e;
    } else {
        const { data: e } = await supabase.from('employees').select('role_id').eq('user_id', userId).maybeSingle();
        empData = e;
    }

    if (!empData?.role_id) return 'sales_representative';

    const { data: roleRec } = await supabase.from('roles').select('role_name').eq('role_id', empData.role_id).maybeSingle();
    return normalizeRole(roleRec?.role_name);
}
