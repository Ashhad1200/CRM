/**
 * Navigation type definitions for the mobile app.
 */

// Stack param lists
export type AuthStackParamList = {
  Login: undefined;
};

export type ContactsStackParamList = {
  ContactList: undefined;
  ContactDetail: { id: string };
};

export type DealsStackParamList = {
  DealList: undefined;
  DealDetail: { id: string };
};

export type TasksStackParamList = {
  TaskList: undefined;
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  ExpenseCapture: undefined;
  SyncConflicts: undefined;
  CheckIn: { accountId?: string } | undefined;
};

// Bottom tab param list
export type MainTabParamList = {
  ContactsTab: undefined;
  DealsTab: undefined;
  TasksTab: undefined;
  MoreTab: undefined;
};

// Root navigator param list
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};
