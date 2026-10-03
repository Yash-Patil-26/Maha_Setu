export const ROLE_HOME = {
  citizen: '/citizen',
  officer: '/officer',
  admin: '/admin',
}

export const ROLE_LABELS = {
  citizen: {
    en: 'Citizen',
    mr: 'नागरिक',
  },
  officer: {
    en: 'Government Official',
    mr: 'सरकारी अधिकारी',
  },
  admin: {
    en: 'Administrator',
    mr: 'प्रशासक',
  },
}

export const ROLE_NAVIGATION = {
  citizen: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      marathi: 'डॅशबोर्ड',
      icon: 'home',
      path: '/citizen',
      end: true,
    },
    {
      id: 'services',
      label: 'Apply for Schemes',
      marathi: 'योजनांसाठी अर्ज',
      icon: 'services',
      path: '/citizen/apply',
    },
    {
      id: 'applications',
      label: 'My Applications',
      marathi: 'माझे अर्ज',
      icon: 'applications',
      path: '/citizen/applications',
    },
    {
      id: 'consent',
      label: 'Consent & Data',
      marathi: 'संमती व डेटा',
      icon: 'consent',
      path: '/citizen/consents',
    },
    {
      id: 'help',
      label: 'Help & Support',
      marathi: 'मदत व सहाय्य',
      icon: 'help',
      path: '/citizen/help',
    },
  ],

  officer: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      marathi: 'डॅशबोर्ड',
      icon: 'home',
      path: '/officer',
      end: true,
    },
    {
      id: 'applications',
      label: 'Approval Queue',
      marathi: 'मंजुरी रांग',
      icon: 'applications',
      path: '/officer/applications',
    },
    {
      id: 'decisions',
      label: 'My Decisions',
      marathi: 'माझे निर्णय',
      icon: 'decisions',
      path: '/officer/decisions',
    },
  ],

  admin: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      marathi: 'डॅशबोर्ड',
      icon: 'home',
      path: '/admin',
      end: true,
    },
    {
      id: 'systems',
      label: 'Manage Systems',
      marathi: 'प्रणाली व्यवस्थापन',
      icon: 'systems',
      path: '/admin/systems',
    },
    {
      id: 'studio',
      label: 'Onboarding Studio',
      marathi: 'ऑनबोर्डिंग स्टुडिओ',
      icon: 'studio',
      path: '/admin/studio',
    },
    {
      id: 'journeys',
      label: 'Journey Management',
      marathi: 'सेवा प्रवास व्यवस्थापन',
      icon: 'journeys',
      path: '/admin/journeys',
    },
    {
      id: 'audit',
      label: 'Access Log',
      marathi: 'प्रवेश नोंद',
      icon: 'applications',
      path: '/admin/audit',
    },
    {
      id: 'metrics',
      label: 'Metrics',
      marathi: 'मेट्रिक्स',
      icon: 'metrics',
      path: '/admin/metrics',
    },
  ],
}

export function getRoleNavigation(role) {
  return ROLE_NAVIGATION[role] || ROLE_NAVIGATION.citizen
}

export function getRoleLabel(role, language = 'en') {
  return (
    ROLE_LABELS[role]?.[language] ||
    ROLE_LABELS[role]?.en ||
    'User'
  )
}
