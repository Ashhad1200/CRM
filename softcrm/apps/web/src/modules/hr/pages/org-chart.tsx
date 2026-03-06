import { useDepartments, useEmployees } from '../api';
import type { Department, Employee } from '../api';

function DepartmentNode({
  department,
  allDepartments,
  employees,
}: {
  department: Department;
  allDepartments: Department[];
  employees: Employee[];
}) {
  const children = allDepartments.filter(
    (d) => d.parentDepartmentId === department.id,
  );
  const deptEmployees = employees.filter(
    (e) => e.departmentId === department.id,
  );

  return (
    <div className="ml-4 border-l-2 border-blue-200 pl-4">
      <div className="mb-2 rounded border border-gray-200 bg-white p-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏢</span>
          <h3 className="font-semibold text-gray-900">{department.name}</h3>
          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
            {deptEmployees.length} employees
          </span>
        </div>

        {deptEmployees.length > 0 && (
          <div className="mt-2 space-y-1">
            {deptEmployees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center gap-2 rounded bg-gray-50 px-2 py-1 text-sm"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                  {emp.firstName[0]}
                  {emp.lastName[0]}
                </div>
                <span className="text-gray-700">
                  {emp.firstName} {emp.lastName}
                </span>
                {emp.managerId === null && (
                  <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700">
                    Manager
                  </span>
                )}
                <span
                  className={`ml-auto rounded px-1.5 py-0.5 text-xs ${
                    emp.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-700'
                      : emp.status === 'ON_LEAVE'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {emp.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {children.map((child) => (
        <DepartmentNode
          key={child.id}
          department={child}
          allDepartments={allDepartments}
          employees={employees}
        />
      ))}
    </div>
  );
}

export default function OrgChartPage() {
  const { data: deptData, isLoading: deptLoading } = useDepartments();
  const { data: empData, isLoading: empLoading } = useEmployees({
    status: 'ACTIVE',
  });

  const departments: Department[] = deptData?.data ?? [];
  const employees: Employee[] = empData?.data ?? [];

  const rootDepartments = departments.filter((d) => !d.parentDepartmentId);
  const isLoading = deptLoading || empLoading;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Organization Chart
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Department and employee hierarchy
        </p>
      </div>

      {isLoading && <p className="text-gray-500">Loading organization...</p>}

      {!isLoading && rootDepartments.length === 0 && (
        <p className="py-8 text-center text-gray-400">
          No departments found. Create departments first.
        </p>
      )}

      {!isLoading && rootDepartments.length > 0 && (
        <div className="space-y-4">
          {rootDepartments.map((dept) => (
            <DepartmentNode
              key={dept.id}
              department={dept}
              allDepartments={departments}
              employees={employees}
            />
          ))}
        </div>
      )}

      {/* Unassigned employees */}
      {!isLoading && employees.some((e) => !e.departmentId) && (
        <div className="mt-6 rounded border border-orange-200 bg-orange-50 p-4">
          <h3 className="mb-2 font-semibold text-orange-800">
            Unassigned Employees
          </h3>
          <div className="space-y-1">
            {employees
              .filter((e) => !e.departmentId)
              .map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center gap-2 text-sm text-orange-700"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-200 text-xs font-medium">
                    {emp.firstName[0]}
                    {emp.lastName[0]}
                  </div>
                  <span>
                    {emp.firstName} {emp.lastName}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
