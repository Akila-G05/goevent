import { createBrowserRouter } from 'react-router-dom';
import { EventsPage } from '@/features/events/pages/events-page';
import { Navbar } from '@/components/shared/navbar';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1">
          <EventsPage />
        </main>
      </div>
    ),
  },
]);
