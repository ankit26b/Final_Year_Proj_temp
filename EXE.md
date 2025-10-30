
1) docker compose up -d
# Wait a few seconds for DB to initialize

Start backend:

2) cd backend

3) npm start
#listening on http://localhost:4000


cd backend
npm run seed -- / 1000

Compute heatmap aggregates:

cd backend
npm run agg -- /


Visualize clicks:

4) http://localhost:4000/api/v1/events?limit=5

5) Open demo/visualizer.html in your browser.

Enter page path / and click Load events. Click points from DB will display.