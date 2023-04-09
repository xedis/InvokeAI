import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web
import dynamicMiddlewares from 'redux-dynamic-middlewares';
import { getPersistConfig } from 'redux-deep-persist';

import canvasReducer from 'features/canvas/store/canvasSlice';
import galleryReducer from 'features/gallery/store/gallerySlice';
import resultsReducer from 'features/gallery/store/resultsSlice';
import uploadsReducer from 'features/gallery/store/uploadsSlice';
import lightboxReducer from 'features/lightbox/store/lightboxSlice';
import generationReducer from 'features/parameters/store/generationSlice';
import postprocessingReducer from 'features/parameters/store/postprocessingSlice';
import systemReducer from 'features/system/store/systemSlice';
import uiReducer from 'features/ui/store/uiSlice';
import modelsReducer from 'features/system/store/modelSlice';
import nodesReducer from 'features/nodes/store/nodesSlice';

import { socketioMiddleware } from './socketio/middleware';
import { socketMiddleware } from 'services/events/middleware';

/**
 * redux-persist provides an easy and reliable way to persist state across reloads.
 *
 * While we definitely want generation parameters to be persisted, there are a number
 * of things we do *not* want to be persisted across reloads:
 *   - Gallery/selected image (user may add/delete images from disk between page loads)
 *   - Connection/processing status
 *   - Availability of external libraries like ESRGAN/GFPGAN
 *
 * These can be blacklisted in redux-persist.
 *
 * The necesssary nested persistors with blacklists are configured below.
 */

const canvasBlacklist = [
  'cursorPosition',
  'isCanvasInitialized',
  'doesCanvasNeedScaling',
].map((blacklistItem) => `canvas.${blacklistItem}`);

const systemBlacklist = [
  'currentIteration',
  'currentStatus',
  'currentStep',
  'isCancelable',
  'isConnected',
  'isESRGANAvailable',
  'isGFPGANAvailable',
  'isProcessing',
  'socketId',
  'totalIterations',
  'totalSteps',
  'openModel',
  'cancelOptions.cancelAfter',
  'isCancelScheduled',
  'sessionId',
].map((blacklistItem) => `system.${blacklistItem}`);

const galleryBlacklist = [
  'categories',
  'currentCategory',
  'currentImage',
  'currentImageUuid',
  'shouldAutoSwitchToNewImages',
  'intermediateImage',
].map((blacklistItem) => `gallery.${blacklistItem}`);

const lightboxBlacklist = ['isLightboxOpen'].map(
  (blacklistItem) => `lightbox.${blacklistItem}`
);

const nodesBlacklist = ['schema', 'invocations'].map(
  (blacklistItem) => `nodes.${blacklistItem}`
);

const rootReducer = combineReducers({
  generation: generationReducer,
  postprocessing: postprocessingReducer,
  gallery: galleryReducer,
  system: systemReducer,
  canvas: canvasReducer,
  ui: uiReducer,
  lightbox: lightboxReducer,
  results: resultsReducer,
  uploads: uploadsReducer,
  models: modelsReducer,
  nodes: nodesReducer,
});

const rootPersistConfig = getPersistConfig({
  key: 'root',
  storage,
  rootReducer,
  blacklist: [
    ...canvasBlacklist,
    ...systemBlacklist,
    ...galleryBlacklist,
    ...lightboxBlacklist,
    ...nodesBlacklist,
    'results',
    'uploads',
    // 'nodes',
  ],
  debounce: 300,
});

const persistedReducer = persistReducer(rootPersistConfig, rootReducer);

// TODO: rip the old middleware out when nodes is complete
export function buildMiddleware() {
  if (import.meta.env.MODE === 'nodes' || import.meta.env.MODE === 'package') {
    return socketMiddleware();
  } else {
    return socketioMiddleware();
  }
}

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: false,
      serializableCheck: false,
    }).concat(dynamicMiddlewares),
  devTools: {
    // Uncommenting these very rapidly called actions makes the redux dev tools output much more readable
    actionsDenylist: [
      'canvas/setCursorPosition',
      'canvas/setStageCoordinates',
      'canvas/setStageScale',
      'canvas/setIsDrawing',
      'canvas/setBoundingBoxCoordinates',
      'canvas/setBoundingBoxDimensions',
      'canvas/setIsDrawing',
      'canvas/addPointToCurrentLine',
    ],
  },
});

export type AppGetState = typeof store.getState;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
