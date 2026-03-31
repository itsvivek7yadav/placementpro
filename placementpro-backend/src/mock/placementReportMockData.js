module.exports = {
  summaryKPIs: {
    totalStudentsEligible: 240,
    totalStudentsPlaced: 132,
    placementPercentage: 55,
    totalCompaniesVisited: 36,
    averagePackage: 8.4,
    medianPackage: 7.5,
    highestPackage: 21,
    totalOffersMade: 158,
    studentsAwaitingResult: 41,
    studentsMarkedAbsent: 9,
    absentRatio: 5.4,
    offerRatio: 65.8,
    recruitersWithSelections: 24
  },
  jobTypeDistribution: [
    { label: 'FTE', value: 94, color: '#2563eb' },
    { label: 'Internship', value: 38, color: '#10b981' },
    { label: 'Internship + PPO', value: 26, color: '#f59e0b' }
  ],
  companyStats: {
    totalCompanies: 36,
    topRecruiters: [
      { companyName: 'Deloitte', offers: 16, totalApplications: 52, avgPackage: 8.2, highestPackage: 11.5 },
      { companyName: 'TCS', offers: 14, totalApplications: 48, avgPackage: 7.1, highestPackage: 9.5 }
    ],
    zeroSelectionCompanies: [
      { companyName: 'Capgemini', applications: 34 },
      { companyName: 'Accenture', applications: 19 }
    ]
  },
  trends: {
    placementTrend: [
      { label: '2025-07', offers: 12, placedStudents: 10, averagePackage: 6.8 },
      { label: '2025-08', offers: 24, placedStudents: 20, averagePackage: 7.4 }
    ],
    programPerformance: [
      { programName: 'MBA IT', eligibleStudents: 120, placedStudents: 74, placementPercentage: 61.7 },
      { programName: 'MBA DS', eligibleStudents: 80, placedStudents: 41, placementPercentage: 51.3 }
    ]
  },
  studentTableData: [
    {
      studentId: 1,
      studentName: 'Isha Iyer',
      prn: '24030141165',
      programName: 'MBA IT',
      batch: '2024-26',
      placementStatus: 'PLACED',
      applicationsCount: 4,
      offerCount: 2,
      pendingCount: 1,
      absentCount: 0,
      selectedCompany: 'Deloitte',
      selectedJobType: 'FTE',
      bestPackage: 8.5,
      lastAppliedAt: '2025-08-12T10:00:00.000Z'
    }
  ]
};
