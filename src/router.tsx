import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import { CarList } from '@features/cars/CarList';
import { CarProfile } from '@features/cars/CarProfile';
import { Statistics } from '@features/stats/Statistics';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <CarList />,
      },
      {
        path: 'car/new',
        element: <CarProfile />,
      },
      {
        path: 'car/:id',
        element: <CarProfile />,
      },
      {
        path: 'car/:id/edit',
        element: <CarProfile defaultEdit={true} />,
      },
      {
        path: 'stats',
        element: <Statistics />,
      },
    ],
  },
]);
