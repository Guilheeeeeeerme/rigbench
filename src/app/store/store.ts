import {
  combineReducers,
  configureStore,
  type ThunkDispatch,
  type UnknownAction,
} from '@reduxjs/toolkit';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from 'redux-persist';
import { connectionReducer } from './slices/connectionSlice';
import { sessionPrefsReducer } from './slices/sessionPrefsSlice';
import { localStorageAdapter } from './localStorage';

const rootReducer = combineReducers({
  connection: connectionReducer,
  sessionPrefs: sessionPrefsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

const persistConfig = {
  key: 'rigbench.redux',
  storage: localStorageAdapter,
  whitelist: ['sessionPrefs'] as string[],
};

export const store = configureStore({
  reducer: persistReducer(persistConfig, rootReducer),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type AppDispatch = ThunkDispatch<RootState, unknown, UnknownAction>;
