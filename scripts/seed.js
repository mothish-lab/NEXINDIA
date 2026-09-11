/**
 * Seed Script — Creates demo data for SIH presentation.
 *
 * Creates:
 *   - ADMIN: admin@civic.local / Admin@123456
 *   - AUTHORITY: officer@civic.local / Officer@123456
 *   - CITIZENS: citizen1-3@civic.local / Citizen@123456
 *   - Departments: Roads, Sanitation, Water Supply, Electrical, Drainage
 *   - Demo issues including the PTH-104 pothole cluster
 *
 * Run: node scripts/seed.js (from project root with .env configured)
 */

const path = require('path');
module.paths.push(path.join(__dirname, '..', 'server', 'node_modules'));

// Load .env from project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Resolve server src path
const serverSrc = path.join(__dirname, '..', 'server', 'src');

// Import models
const User = require(path.join(serverSrc, 'models', 'User'));
const Department = require(path.join(serverSrc, 'models', 'Department'));
const Issue = require(path.join(serverSrc, 'models', 'Issue'));
const Report = require(path.join(serverSrc, 'models', 'Report'));
const Escalation = require(path.join(serverSrc, 'models', 'Escalation'));
const Notification = require(path.join(serverSrc, 'models', 'Notification'));

const { generateImageEmbedding } = require(path.join(serverSrc, 'services', 'aiService'));
const { calculatePriority } = require(path.join(serverSrc, 'services', 'priorityService'));
const { calculateSLADeadline } = require(path.join(serverSrc, 'services', 'slaService'));

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      Issue.deleteMany({}),
      Report.deleteMany({}),
      Escalation.deleteMany({}),
      Notification.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    // Create departments
    const departments = await Department.insertMany([
      {
        name: 'Roads',
        authorityLevel: 'WARD',
        slaHours: 24,
        categories: ['POTHOLE', 'ROAD_DAMAGE'],
      },
      {
        name: 'Sanitation',
        authorityLevel: 'WARD',
        slaHours: 12,
        categories: ['GARBAGE'],
      },
      {
        name: 'Water Supply',
        authorityLevel: 'ZONE',
        slaHours: 8,
        categories: ['WATER_LEAK', 'WATER_LOGGING'],
      },
      {
        name: 'Electrical',
        authorityLevel: 'WARD',
        slaHours: 24,
        categories: ['STREETLIGHT'],
      },
      {
        name: 'Drainage',
        authorityLevel: 'ZONE',
        slaHours: 12,
        categories: ['DRAINAGE'],
      },
    ]);
    console.log('🏢 Created departments:', departments.map(d => d.name).join(', '));

    const roadsDept = departments.find(d => d.name === 'Roads');
    const sanitationDept = departments.find(d => d.name === 'Sanitation');
    const waterDept = departments.find(d => d.name === 'Water Supply');
    const electricalDept = departments.find(d => d.name === 'Electrical');
    const drainageDept = departments.find(d => d.name === 'Drainage');

    // Create users
    const SALT = 12;
    const adminHash = await bcrypt.hash('Admin@123456', SALT);
    const officerHash = await bcrypt.hash('Officer@123456', SALT);
    const citizenHash = await bcrypt.hash('Citizen@123456', SALT);

    const [admin, officer, citizen1, citizen2, citizen3] = await User.insertMany([
      {
        name: 'Admin User',
        email: 'admin@civic.local',
        phone: '9000000001',
        passwordHash: adminHash,
        role: 'ADMIN',
      },
      {
        name: 'Officer Rajesh Kumar',
        email: 'officer@civic.local',
        phone: '9000000002',
        passwordHash: officerHash,
        role: 'AUTHORITY',
        department: roadsDept._id,
      },
      {
        name: 'Priya Sharma',
        email: 'citizen1@civic.local',
        phone: '9000000003',
        passwordHash: citizenHash,
        role: 'CITIZEN',
      },
      {
        name: 'Rahul Verma',
        email: 'citizen2@civic.local',
        phone: '9000000004',
        passwordHash: citizenHash,
        role: 'CITIZEN',
      },
      {
        name: 'Ananya Patel',
        email: 'citizen3@civic.local',
        phone: '9000000005',
        passwordHash: citizenHash,
        role: 'CITIZEN',
      },
    ]);
    console.log('👥 Created users: admin, officer, citizen1, citizen2, citizen3');

    // === DEMO ISSUE 1: PTH-104 Pothole Cluster ===
    // Master issue reported by citizen1 — same location, pothole
    const potholeLocation = { latitude: 28.6139, longitude: 77.2090, locationText: 'MG Road, Near Signal 5, New Delhi' };
    const potholeEmbedding = await generateImageEmbedding(null, 'pothole road damage deep crater');

    const slaDeadline1 = await calculateSLADeadline(roadsDept._id, new Date());
    const { priorityScore: ps1, priority: p1 } = calculatePriority({
      category: 'POTHOLE', reportCount: 3, slaDeadline: slaDeadline1, createdAt: new Date(),
    });

    const masterPothole = await Issue.create({
      ticketId: 'PTH-104',
      reportedBy: citizen1._id,
      title: 'Large pothole on MG Road',
      description: 'There is a very large and deep pothole on MG Road near Signal 5. Vehicles are getting damaged. Very dangerous for two-wheelers.',
      category: 'POTHOLE',
      aiCategory: 'POTHOLE',
      aiConfidence: 0.88,
      ...potholeLocation,
      imageUrl: 'https://images.unsplash.com/photo-1584467541268-b040f83be3fd?w=800',
      imagePublicId: 'demo/pothole_master',
      imageEmbedding: potholeEmbedding,
      status: 'ASSIGNED',
      priority: p1,
      priorityScore: ps1,
      department: roadsDept._id,
      assignedTo: officer._id,
      slaDeadline: slaDeadline1,
      isMaster: true,
      reportCount: 3,
    });

    // Citizen2 duplicate report
    const embed2 = await generateImageEmbedding(null, 'pothole road deep hole mg road');
    await Report.create({
      issueId: masterPothole._id,
      reportedBy: citizen2._id,
      imageUrl: 'https://images.unsplash.com/photo-1548625149-720834f2f27a?w=800',
      imagePublicId: 'demo/pothole_report2',
      imageEmbedding: embed2,
      latitude: potholeLocation.latitude + 0.0001,
      longitude: potholeLocation.longitude + 0.0001,
      category: 'POTHOLE',
      description: 'Same pothole, very dangerous. My bike got damaged.',
      similarityScore: 0.89,
      geoScore: 0.95,
      imageScore: 0.85,
      categoryScore: 1.0,
      timeScore: 0.92,
    });

    // Citizen3 duplicate report
    const embed3 = await generateImageEmbedding(null, 'pothole mg road signal 5 delhi');
    await Report.create({
      issueId: masterPothole._id,
      reportedBy: citizen3._id,
      imageUrl: 'https://images.unsplash.com/photo-1621887348744-6b0444f8a058?w=800',
      imagePublicId: 'demo/pothole_report3',
      imageEmbedding: embed3,
      latitude: potholeLocation.latitude - 0.0001,
      longitude: potholeLocation.longitude - 0.0001,
      category: 'POTHOLE',
      description: 'Pothole exists since 2 months! No action taken.',
      similarityScore: 0.91,
      geoScore: 0.93,
      imageScore: 0.88,
      categoryScore: 1.0,
      timeScore: 0.95,
    });

    console.log('🕳️  Created PTH-104 master pothole with 3 citizen reports (reportCount=3)');

    // === DEMO ISSUE 2: Overdue Garbage (past SLA) ===
    const overdueDate = new Date();
    overdueDate.setHours(overdueDate.getHours() - 36); // 36 hours ago
    const slaOverdue = new Date(overdueDate);
    slaOverdue.setHours(slaOverdue.getHours() + 12); // SLA was 12h → already breached

    const { priorityScore: ps2, priority: p2 } = calculatePriority({
      category: 'GARBAGE', reportCount: 1, slaDeadline: slaOverdue, createdAt: overdueDate,
    });

    const garbageIssue = await Issue.create({
      ticketId: 'GRB-201',
      reportedBy: citizen2._id,
      title: 'Garbage heap near Community Center',
      description: 'Large pile of garbage dumped near Community Center, Ward 12. Spreading disease. Urgent action needed.',
      category: 'GARBAGE',
      aiCategory: 'GARBAGE',
      aiConfidence: 0.85,
      latitude: 28.6200,
      longitude: 77.2100,
      locationText: 'Community Center, Ward 12, New Delhi',
      imageUrl: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800',
      imagePublicId: 'demo/garbage',
      status: 'OPEN',
      priority: p2,
      priorityScore: ps2,
      department: sanitationDept._id,
      slaDeadline: slaOverdue,
      isAging: true,
      isEscalated: true,
      escalationLevel: 1,
      isMaster: true,
      reportCount: 1,
      createdAt: overdueDate,
      updatedAt: overdueDate,
    });

    await Escalation.create({
      issueId: garbageIssue._id,
      fromLevel: 0,
      toLevel: 1,
      reason: `SLA breached. Issue #GRB-201 auto-escalated from Field Officer to Department Officer.`,
      escalatedBy: 'SYSTEM',
    });

    console.log('🗑️  Created overdue + escalated garbage issue GRB-201');

    // === DEMO ISSUE 3: Aging Water Leak (near SLA breach) ===
    const agingCreated = new Date();
    agingCreated.setHours(agingCreated.getHours() - 7); // 7 hours ago
    const agingSLA = new Date(agingCreated);
    agingSLA.setHours(agingSLA.getHours() + 8); // 8h SLA, 1h remaining → AGING

    const { priorityScore: ps3, priority: p3 } = calculatePriority({
      category: 'WATER_LEAK', reportCount: 2, slaDeadline: agingSLA, createdAt: agingCreated,
    });

    await Issue.create({
      ticketId: 'WTL-305',
      reportedBy: citizen1._id,
      title: 'Water pipe burst near Sector 7 market',
      description: 'Water pipe has burst. Road is flooded. Water being wasted for hours. 2 citizens have reported.',
      category: 'WATER_LEAK',
      aiCategory: 'WATER_LEAK',
      aiConfidence: 0.87,
      latitude: 28.6050,
      longitude: 77.2200,
      locationText: 'Sector 7 Market, New Delhi',
      imageUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800',
      imagePublicId: 'demo/water_leak',
      status: 'IN_PROGRESS',
      priority: p3,
      priorityScore: ps3,
      department: waterDept._id,
      assignedTo: officer._id,
      slaDeadline: agingSLA,
      isAging: true,
      isEscalated: false,
      isMaster: true,
      reportCount: 2,
      createdAt: agingCreated,
      updatedAt: agingCreated,
    });

    console.log('💧 Created aging water leak issue WTL-305');

    // === DEMO ISSUE 4: Resolved Issue Awaiting Citizen Verification ===
    const resolvedCreated = new Date();
    resolvedCreated.setHours(resolvedCreated.getHours() - 20);

    await Issue.create({
      ticketId: 'STL-402',
      reportedBy: citizen3._id,
      title: 'Broken streetlight on Park Road',
      description: 'Street light has been broken for a week. Very dark at night, safety concern.',
      category: 'STREETLIGHT',
      aiCategory: 'STREETLIGHT',
      aiConfidence: 0.82,
      latitude: 28.6300,
      longitude: 77.2150,
      locationText: 'Park Road, Lajpat Nagar, New Delhi',
      imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      imagePublicId: 'demo/streetlight',
      status: 'CITIZEN_VERIFICATION',
      priority: 'MEDIUM',
      priorityScore: 35,
      department: electricalDept._id,
      assignedTo: officer._id,
      slaDeadline: new Date(resolvedCreated.getTime() + 24 * 60 * 60 * 1000),
      isAging: false,
      isEscalated: false,
      isMaster: true,
      reportCount: 1,
      resolutionImageUrl: 'https://images.unsplash.com/photo-1562923815-4e28a4756aed?w=800',
      resolutionImagePublicId: 'demo/streetlight_resolved',
      resolutionDescription: 'The broken streetlight bulb has been replaced and the lamp post is now functional. Tested at 7PM.',
      createdAt: resolvedCreated,
      updatedAt: new Date(),
    });

    // Notify citizen3 to verify
    await Notification.create({
      userId: citizen3._id,
      type: 'RESOLUTION_SUBMITTED',
      message: '🔧 Authority has submitted a resolution for issue #STL-402. Please verify the resolution.',
    });

    console.log('💡 Created streetlight issue STL-402 awaiting citizen verification');

    // === DEMO ISSUE 5: Normal Open Issue ===
    const drainSLA = await calculateSLADeadline(drainageDept._id, new Date());
    const { priorityScore: ps5, priority: p5 } = calculatePriority({
      category: 'DRAINAGE', reportCount: 1, slaDeadline: drainSLA, createdAt: new Date(),
    });

    await Issue.create({
      ticketId: 'DRN-501',
      reportedBy: citizen2._id,
      title: 'Blocked drain causing waterlogging',
      description: 'Main drain in the colony is blocked. Water logging during light rain too. Need immediate clearing.',
      category: 'DRAINAGE',
      aiCategory: 'DRAINAGE',
      aiConfidence: 0.84,
      latitude: 28.6180,
      longitude: 77.2050,
      locationText: 'Colony Main Road, Saket, New Delhi',
      imageUrl: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
      imagePublicId: 'demo/drainage',
      status: 'OPEN',
      priority: p5,
      priorityScore: ps5,
      department: drainageDept._id,
      slaDeadline: drainSLA,
      isAging: false,
      isEscalated: false,
      isMaster: true,
      reportCount: 1,
    });

    console.log('🌊 Created normal open drainage issue DRN-501');

    // Create notifications for all citizens
    await Notification.insertMany([
      {
        userId: citizen1._id,
        type: 'ISSUE_CREATED',
        message: '✅ Your issue #PTH-104 has been received and is being processed.',
      },
      {
        userId: citizen1._id,
        type: 'ISSUE_CLASSIFIED',
        message: '🤖 AI has classified your issue as "POTHOLE" (88% confidence).',
      },
      {
        userId: citizen1._id,
        type: 'ISSUE_ASSIGNED',
        message: '📋 Issue #PTH-104 has been assigned to Roads Department.',
      },
      {
        userId: citizen2._id,
        type: 'DUPLICATE_DETECTED',
        message: '🔗 Your report has been linked to existing issue #PTH-104 (3 citizens reporting). Priority has been increased.',
      },
      {
        userId: citizen2._id,
        type: 'ISSUE_ESCALATED',
        message: '🚨 Issue #GRB-201 has been ESCALATED to Department Officer due to SLA breach.',
      },
    ]);

    console.log('🔔 Created sample notifications');

    console.log('\n============================================================');
    console.log('✅ SEED COMPLETE — Demo data ready for SIH presentation');
    console.log('============================================================');
    console.log('\n📧 DEMO CREDENTIALS:');
    console.log('   Admin:     admin@civic.local     / Admin@123456');
    console.log('   Authority: officer@civic.local   / Officer@123456');
    console.log('   Citizen 1: citizen1@civic.local  / Citizen@123456');
    console.log('   Citizen 2: citizen2@civic.local  / Citizen@123456');
    console.log('   Citizen 3: citizen3@civic.local  / Citizen@123456');
    console.log('\n📋 DEMO ISSUES:');
    console.log('   PTH-104 — POTHOLE, 3 reports, ASSIGNED (CRITICAL priority)');
    console.log('   GRB-201 — GARBAGE, OVERDUE, ESCALATED (Level 1)');
    console.log('   WTL-305 — WATER_LEAK, AGING, IN_PROGRESS');
    console.log('   STL-402 — STREETLIGHT, CITIZEN_VERIFICATION pending');
    console.log('   DRN-501 — DRAINAGE, OPEN (normal)');
    console.log('============================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

seed();
