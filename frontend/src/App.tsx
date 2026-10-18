import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useSession } from '@/session/SessionProvider';
import { PERSONAS } from '@/session/personas';
import { RequireCapability, RequireSession } from '@/session/guards';
import { AppShell } from '@/components/layout/AppShell';
import { Home } from '@/pages/home/Home';
import { NotFound } from '@/pages/NotFound';
import { OverviewPage } from '@/pages/app/OverviewPage';
import { WalkthroughPage } from '@/pages/app/WalkthroughPage';
import { GraphExplorerPage } from '@/pages/app/GraphExplorerPage';
import { PapersPage } from '@/pages/app/PapersPage';
import { PaperDetailPage } from '@/pages/app/PaperDetailPage';
import { AssignmentsPage } from '@/pages/app/AssignmentsPage';
import { ReviewsPage } from '@/pages/app/ReviewsPage';
import { PathsPage } from '@/pages/app/PathsPage';
import { AnalyticsPage } from '@/pages/app/AnalyticsPage';
import { BenchmarkPage } from '@/pages/app/BenchmarkPage';
import { SchemaPage } from '@/pages/app/SchemaPage';
import { AdminPage } from '@/pages/app/AdminPage';
import { MyPapersPage } from '@/pages/app/MyPapersPage';
import { MyReviewsPage } from '@/pages/app/MyReviewsPage';
import { KitGallery } from '@/dev/KitGallery';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

function WorkspaceIndex() {
  const { session } = useSession();
  if (!session) return <Navigate to="/" replace />;
  return <Navigate to={PERSONAS[session.persona].landing} replace />;
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dev/kit" element={<KitGallery />} />
        <Route
        path="/app"
        element={
          <RequireSession>
            <AppShell />
          </RequireSession>
        }
      >
        <Route index element={<WorkspaceIndex />} />
        <Route path="walkthrough" element={<RequireCapability capability="viewWalkthrough"><WalkthroughPage /></RequireCapability>} />
        <Route path="overview" element={<RequireCapability capability="browseAll"><OverviewPage /></RequireCapability>} />
        <Route path="graph" element={<GraphExplorerPage />} />
        <Route path="papers" element={<RequireCapability capability="browseAll"><PapersPage /></RequireCapability>} />
        <Route path="papers/:paperId" element={<RequireCapability capability="browseAll"><PaperDetailPage /></RequireCapability>} />
        <Route path="assignments" element={<RequireCapability capability="assignReviewer"><AssignmentsPage /></RequireCapability>} />
        <Route path="assignments/:paperId" element={<RequireCapability capability="assignReviewer"><AssignmentsPage /></RequireCapability>} />
        <Route path="reviews" element={<RequireCapability capability="browseAll"><ReviewsPage /></RequireCapability>} />
        <Route path="reviews/:paperId" element={<RequireCapability capability="browseAll"><ReviewsPage /></RequireCapability>} />
        <Route path="paths" element={<RequireCapability capability="viewPaths"><PathsPage /></RequireCapability>} />
        <Route path="analytics" element={<RequireCapability capability="viewAnalytics"><AnalyticsPage /></RequireCapability>} />
        <Route path="benchmark" element={<RequireCapability capability="viewBenchmark"><BenchmarkPage /></RequireCapability>} />
        <Route path="benchmark/:scenario" element={<RequireCapability capability="viewBenchmark"><BenchmarkPage /></RequireCapability>} />
        <Route path="schema" element={<RequireCapability capability="viewSchema"><SchemaPage /></RequireCapability>} />
        <Route path="admin" element={<RequireCapability capability="viewAdmin"><AdminPage /></RequireCapability>} />
        <Route path="my-papers" element={<RequireCapability capability="createPaper"><MyPapersPage /></RequireCapability>} />
        <Route path="my-papers/:paperId" element={<RequireCapability capability="createPaper"><MyPapersPage /></RequireCapability>} />
        <Route path="my-reviews" element={<RequireCapability capability="submitReview"><MyReviewsPage /></RequireCapability>} />
        <Route path="my-reviews/:paperId" element={<RequireCapability capability="submitReview"><MyReviewsPage /></RequireCapability>} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}
