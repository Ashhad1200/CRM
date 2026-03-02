import { lazy } from 'react';
import { Route, Routes } from 'react-router';
import { ModuleLayout, type ModuleTab } from '../../layouts/module-layout';

const ProjectList = lazy(() => import('./pages/project-list'));
const ProjectDetail = lazy(() => import('./pages/project-detail'));

const tabs: ModuleTab[] = [
  { label: 'All Projects', to: '.', end: true },
];

export function ProjectsRoutes() {
  return (
    <Routes>
      <Route element={<ModuleLayout title="Projects" tabs={tabs} />}>
        <Route index element={<ProjectList />} />
        <Route path=":id" element={<ProjectDetail />} />
      </Route>
    </Routes>
  );
}
