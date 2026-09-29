import type { GlobalThemeOverrides } from 'naive-ui';

export const lightThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#2563eb',
    primaryColorHover: '#3b82f6',
    primaryColorPressed: '#1d4ed8',
    primaryColorSuppl: '#3b82f6',
  },

  Menu: {
    itemHeight: '32px',
  },

  Layout: {
    color: '#f8fafc',
    siderColor: '#ffffff',
    headerColor: '#ffffff',
  },

  Card: {
    color: '#ffffff',
    borderColor: '#e2e8f0',
  },

  AutoComplete: {
    peers: {
      InternalSelectMenu: { height: '500px' },
    },
  },
};

export const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#2563eb',
    primaryColorHover: '#3b82f6',
    primaryColorPressed: '#1d4ed8',
    primaryColorSuppl: '#3b82f6',
  },

  Notification: {
    color: '#1e293b',
  },

  AutoComplete: {
    peers: {
      InternalSelectMenu: { height: '500px', color: '#1e293b' },
    },
  },

  Menu: {
    itemHeight: '32px',
  },

  Layout: {
    color: '#0f172a',
    siderColor: '#1e293b',
    headerColor: '#1e293b',
    siderBorderColor: '#334155',
  },

  Card: {
    color: '#1e293b',
    borderColor: '#334155',
  },

  Table: {
    tdColor: '#1e293b',
    thColor: '#334155',
  },
};

