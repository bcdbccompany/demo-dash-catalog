import { http, HttpResponse } from 'msw';
import openMeteoData from './fixtures/openmeteo.json';
import restCountriesData from './fixtures/restcountries.json';
import postsData from './fixtures/posts.json';

export const handlers = [
  // Open-Meteo API
  http.get('https://api.open-meteo.com/v1/forecast', ({ request }) => {
    const url = new URL(request.url);
    const lat = url.searchParams.get('latitude');
    const lon = url.searchParams.get('longitude');
    
    // Different temperature data for different cities
    if (lat === '-22.91' && lon === '-43.17') {
      // Rio de Janeiro - slightly warmer
      return HttpResponse.json({
        ...openMeteoData,
        hourly: {
          ...openMeteoData.hourly,
          temperature_2m: openMeteoData.hourly.temperature_2m.map(temp => temp + 2)
        }
      });
    }
    
    return HttpResponse.json(openMeteoData);
  }),

  // REST Countries API
  http.get('https://restcountries.com/v3.1/all', ({ request }) => {
    const url = new URL(request.url);
    const fields = url.searchParams.get('fields');
    
    if (fields) {
      return HttpResponse.json(restCountriesData);
    }
    
    return HttpResponse.json(restCountriesData);
  }),

  // JSONPlaceholder API
  http.get('https://jsonplaceholder.typicode.com/posts', ({ request }) => {
    const url = new URL(request.url);
    const limit = url.searchParams.get('_limit');
    
    if (limit) {
      return HttpResponse.json(postsData.posts.slice(0, parseInt(limit)));
    }
    
    return HttpResponse.json(postsData.posts);
  }),

  http.get('https://jsonplaceholder.typicode.com/posts/:id', ({ params }) => {
    const { id } = params;
    const post = postsData.posts.find(p => p.id === parseInt(id as string));
    
    if (!post) {
      return new HttpResponse(null, { status: 404 });
    }
    
    return HttpResponse.json(post);
  }),

  http.get('https://jsonplaceholder.typicode.com/posts/:id/comments', ({ params }) => {
    const { id } = params;
    const comments = postsData.comments.filter(c => c.postId === parseInt(id as string));
    
    return HttpResponse.json(comments);
  }),

  http.get('https://jsonplaceholder.typicode.com/users', () => {
    return HttpResponse.json(postsData.users);
  }),

  http.post('https://jsonplaceholder.typicode.com/posts', async ({ request }) => {
    const body = await request.json() as any;
    
    return HttpResponse.json({
      id: 101,
      ...body
    });
  }),

  http.put('https://jsonplaceholder.typicode.com/posts/:id', async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as any;
    
    return HttpResponse.json({
      id: parseInt(id as string),
      ...body
    });
  }),

  http.delete('https://jsonplaceholder.typicode.com/posts/:id', () => {
    return new HttpResponse(null, { status: 200 });
  }),
];