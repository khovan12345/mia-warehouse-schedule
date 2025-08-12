/**
 * Configuration file for MIA.VN Warehouse Schedule System
 */

export const CONFIG = {
  // Employee management
  employees: {
    list: ["Phong", "Tùng", "Tuấn"],
    database: [
      {
        id: 1,
        name: "Phong",
        type: "fulltime",
        experience: "senior",
        preferred_shifts: ["morning", "midday"],
        color: "phong",
      },
      {
        id: 2,
        name: "Tùng",
        type: "fulltime",
        experience: "middle",
        preferred_shifts: ["afternoon", "midday"],
        color: "tung",
      },
      {
        id: 3,
        name: "Tuấn",
        type: "fulltime",
        experience: "junior",
        preferred_shifts: ["morning", "afternoon"],
        color: "tuan",
      },
      {
        id: 4,
        name: "An",
        type: "fulltime",
        experience: "middle",
        preferred_shifts: ["morning", "midday"],
        color: "an",
      },
      {
        id: 5,
        name: "Bình",
        type: "fulltime",
        experience: "junior",
        preferred_shifts: ["afternoon", "midday"],
        color: "binh",
      },
    ],
    maxEmployees: 5,
    minEmployees: 2,
    targetHours: 208, // Mục tiêu 208h/tháng cho mỗi nhân viên
    maxOrdersPerEmployee: 70,
    restDaysPerWeek: 1, // Luật: 1 ngày nghỉ/tuần
  },

  // Warehouse operating hours
  warehouseHours: {
    open: 8,
    close: 20,
    totalHours: 12,
  },

  // Shift configurations
  shifts: {
    // Standard shifts - 8h work + 1h break = 9h total
    morning: {
      start: "08:00",
      end: "17:00",
      break: { start: "12:00", end: "13:00" },
      actualHours: 8,
      coverage: [8, 12, 13, 17],
      description: "Ca sáng",
      type: "standard",
    },
    afternoon: {
      start: "12:00",
      end: "21:00",
      break: { start: "16:00", end: "17:00" },
      actualHours: 8,
      coverage: [12, 16, 17, 21],
      description: "Ca chiều",
      type: "standard",
    },
    midday: {
      start: "10:00",
      end: "19:00",
      break: { start: "14:00", end: "15:00" },
      actualHours: 8,
      coverage: [10, 14, 15, 19],
      description: "Ca trưa",
      type: "standard",
    },
    // Peak day shifts - extended hours
    peak_morning: {
      start: "08:00",
      end: "18:00",
      break: { start: "12:00", end: "13:00" },
      actualHours: 9,
      coverage: [8, 12, 13, 18],
      description: "Ca sáng mở rộng",
      type: "peak",
    },
    peak_afternoon: {
      start: "11:00",
      end: "21:00",
      break: { start: "15:00", end: "16:00" },
      actualHours: 9,
      coverage: [11, 15, 16, 21],
      description: "Ca chiều mở rộng",
      type: "peak",
    },
    peak_midday: {
      start: "09:00",
      end: "19:00",
      break: { start: "13:00", end: "14:00" },
      actualHours: 9,
      coverage: [9, 13, 14, 19],
      description: "Ca trưa mở rộng",
      type: "peak",
    },
  },

  // Delivery schedule
  deliveryTimes: {
    shopee: {
      name: "Shopee Express",
      times: ["11:59", "18:00"],
      days: "all",
    },
    ghn: {
      name: "GHN Cồng kềnh",
      times: ["11:59", "18:00"],
      days: "all",
    },
    vnp: {
      name: "VNP Cồng kềnh",
      normal: {
        start: "15:00",
        end: "15:30",
        days: [2, 3, 4, 5, 6], // T3-T7
      },
      special: {
        start: "09:00",
        end: "10:00",
        days: [0, 1], // CN & T2
      },
    },
  },

  // Peak days configuration
  peakDays: {
    fixed: [15, 25], // Mid-month and end-month sales
    double: true, // Double days (8/8, 9/9, etc.)
    custom: [], // User-defined peak days
    multiplier: 1.5, // Workload multiplier for peak days
  },

  // Public holidays (Vietnam)
  holidays: {
    1: [1], // New Year
    4: [30], // Liberation Day
    5: [1], // Labor Day
    9: [2], // National Day
    // Lunar calendar holidays will be calculated separately
  },

  // Multipliers (giống file gốc)
  multipliers: {
    overtime: 1.5, // Tăng ca x1.5
    holiday: 4, // Ngày lễ x4 (theo file gốc)
    sunday: 1.5, // CN x1.5 (theo file gốc)
    night: 1.3,
  },

  // Optimization settings
  optimization: {
    minEmployeesNormal: 2,
    minEmployeesPeak: 3,
    minEmployeesSunday: 2,
    maxOvertimeHours: 40,
    restDaysPerWeek: 1,
    maxConsecutiveDays: 6,
    coveragePriority: ["11:59", "18:00", "15:00-15:30", "09:00-10:00"],
    strategies: {
      balanced: {
        name: "Cân bằng",
        overtimeWeight: 0.5,
        coverageWeight: 0.5,
      },
      "peak-focus": {
        name: "Ưu tiên Peak",
        overtimeWeight: 0.3,
        coverageWeight: 0.7,
      },
      "minimal-ot": {
        name: "Tối thiểu tăng ca",
        overtimeWeight: 0.8,
        coverageWeight: 0.2,
      },
    },
  },

  // UI Configuration
  ui: {
    animation: {
      duration: 200,
      easing: "ease-out",
    },
    toast: {
      duration: 5000,
      position: "top-right",
    },
    theme: {
      default: "light",
      savePreference: true,
    },
  },

  // Storage keys
  storage: {
    prefix: "mia_schedule_",
    keys: {
      schedule: "current_schedule",
      employees: "employees_data",
      settings: "user_settings",
      theme: "theme_preference",
      peakDays: "custom_peak_days",
      lastSync: "last_sync_time",
    },
  },

  // Export settings
  export: {
    csv: {
      delimiter: ",",
      encoding: "utf-8",
      includeHeaders: true,
    },
    excel: {
      sheetName: "Lịch làm việc",
      includeCharts: true,
    },
    pdf: {
      orientation: "landscape",
      format: "a4",
      margins: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20,
      },
    },
  },

  // API endpoints (for future use)
  api: {
    baseUrl: import.meta.env.VITE_API_URL || "",
    endpoints: {
      schedule: "/api/schedule",
      employees: "/api/employees",
      holidays: "/api/holidays",
      workload: "/api/workload",
    },
  },

  // Feature flags
  features: {
    darkMode: true,
    pwa: true,
    notifications: true,
    charts: true,
    import: true,
    export: true,
    print: true,
    api: false,
  },
};

// Freeze configuration to prevent accidental modifications
Object.freeze(CONFIG);
