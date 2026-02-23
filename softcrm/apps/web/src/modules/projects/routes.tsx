import { lazy } from 'react';
import { Route } from 'react-router';

const ProjectList = lazy(() => import('./pages/project-list'));
const ProjectDetail = lazy(() => import('./pages/project-detail'));

export function ProjectsRoutes() {
  return (
    <>
      <Route index element={<ProjectList />} />
      <Route path=":id" element={<ProjectDetail />} />
    </>
  );
}
