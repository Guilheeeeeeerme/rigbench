import { configureStore, type ThunkDispatch, type UnknownAction } from '@reduxjs/toolkit';
import { connectionReducer } from './slices/connectionSlice';

const rootReducer = {
  connection: connectionReducer,
};

export const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = ThunkDispatch<RootState, unknown, UnknownAction>;
