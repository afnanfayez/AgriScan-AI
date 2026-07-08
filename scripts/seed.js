const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Parse .env file manually
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env.');
  process.exit(1);
}

// 2. Initialize Supabase Admin Client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const mockUsers = [
  {
    name: 'أحمد المنصور',
    email: 'ahmed.farms@agriscan.ai',
    password: 'Password123',
    accountType: 'Farmer',
    location: 'القصيم، السعودية',
    units: 'metric',
    plan: 'Pro',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
    farms: [
      {
        name: 'مزارع النخيل العضوية بالقصيم',
        zone_count: 5,
        plants: [
          {
            name: 'نخلة خلاص (حقل 1)',
            type: 'Palm Tree',
            planting_date: '2024-03-15',
            health_status: 'Healthy',
            photo_url: 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?w=400&h=300&fit=crop',
            notes: ['تم إضافة السماد العضوي السنوي وتعديل نظام الري بالتنقيط.'],
            scans: [],
          },
          {
            name: 'نخلة سكري (حقل 2)',
            type: 'Palm Tree',
            planting_date: '2024-04-20',
            health_status: 'Warning',
            photo_url: 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?w=400&h=300&fit=crop',
            notes: ['رصد نشاط خفيف لسوسة النخيل الحمراء في أسفل الجذع.'],
            scans: [
              {
                diagnosis: 'سوسة النخيل الحمراء (بداية إصابة)',
                confidence: 82.5,
                severity: 'Medium',
                symptoms: 'وجود إفرازات صمغية بنية على الجذع مع نشارة خشبية خفيفة حول الفتحات.',
                treatment: {
                  type: 'سوسة النخيل الحمراء',
                  organic_steps: [
                    'حقن الجذع بمحلول الثوم والزيوت العطرية المركزة كطارد طبيعي لليرقات.',
                    'تنظيف فتحات التغذية وتغطيتها بخليط الطين والجير لحماية النخلة.',
                  ],
                  chemical_steps: [
                    'حقن الجذع بمبيد إيميداكلوبريد (Imidacloprid) بتركيز موصى به.',
                    'رش وقائي للمحيط بمبيد السيبرمثرين لقتل الحشرات البالغة.',
                  ],
                  status: 'In Progress',
                },
              },
            ],
          },
          {
            name: 'طماطم محمية (الصوبة 3)',
            type: 'Vegetable',
            planting_date: '2026-05-01',
            health_status: 'Critical',
            photo_url: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=400&h=300&fit=crop',
            notes: ['انتشار سريع للبقع الداكنة على الأوراق بعد موجة الرطوبة الأخيرة.'],
            scans: [
              {
                diagnosis: 'اللفحة المتأخرة (Tomato Late Blight)',
                confidence: 95.0,
                severity: 'High',
                symptoms: 'بقع مائية داكنة على الأوراق مع نمو عفن أبيض خفيف أسفلها وجفاف سريع للأوراق والثمار.',
                treatment: {
                  type: 'Tomato Late Blight',
                  organic_steps: [
                    'تقليم الأوراق والسيقان المصابة فوراً والتخلص منها حرقاً خارج الصوبة.',
                    'رش وقائي بمحلول بيكربونات البوتاسيوم لتقليل حموضة سطح الأوراق.',
                  ],
                  chemical_steps: [
                    'رش فوري بمبيد كلوروثالونيل الوقائي لوقف انتشار الجراثيم.',
                    'معالجة جهازية بمبيد ميفينوكسام (Mefenoxam) لحماية الأنسجة السليمة.',
                  ],
                  status: 'Pending',
                },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'نورة الحربي',
    email: 'nora.nursery@agriscan.ai',
    password: 'Password123',
    accountType: 'Nursery',
    location: 'تبوك، السعودية',
    units: 'metric',
    plan: 'Enterprise',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
    farms: [
      {
        name: 'مشتل النخبة للزهور والنباتات البرية',
        zone_count: 3,
        plants: [
          {
            name: 'شتلات سدر بري (منطقة أ)',
            type: 'Tree',
            planting_date: '2025-10-10',
            health_status: 'Healthy',
            photo_url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=400&h=300&fit=crop',
            notes: ['الشتلات بحالة ممتازة ونسبة النمو مطابقة للمواصفات.'],
            scans: [],
          },
          {
            name: 'جوري هولندي أحمر (الظلة 2)',
            type: 'Flower',
            planting_date: '2026-02-15',
            health_status: 'Warning',
            photo_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=300&fit=crop',
            notes: ['ملاحظة طبقة بيضاء تشبه الدقيق على الأوراق الفتية.'],
            scans: [
              {
                diagnosis: 'البياض الدقيقي (Powdery Mildew)',
                confidence: 88.0,
                severity: 'Medium',
                symptoms: 'طبقة مسحوقية بيضاء رمادية تغطي أسطح الأوراق مع التوائها وجفافها التدريجي.',
                treatment: {
                  type: 'Powdery Mildew',
                  organic_steps: [
                    'رش الأوراق بمزيج الحليب المخفف بالماء (نسبة 1:9) تحت أشعة الشمس.',
                    'استخدام زيت النيم العضوي بانتظام لمنع نمو الفطريات.',
                  ],
                  chemical_steps: [
                    'رش مبيد فطري وقائي يحتوي على مادة ميكلوبوتانيل (Myclobutanil).',
                  ],
                  status: 'In Progress',
                },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'خالد العتيبي',
    email: 'khaled.garden@agriscan.ai',
    password: 'Password123',
    accountType: 'Gardener',
    location: 'الرياض، السعودية',
    units: 'metric',
    plan: 'Free',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
    farms: [
      {
        name: 'حديقة المنزل الخلفية',
        zone_count: 2,
        plants: [
          {
            name: 'نعناع حساوي (أحواض المطبخ)',
            type: 'Herb',
            planting_date: '2026-06-01',
            health_status: 'Healthy',
            photo_url: 'https://images.unsplash.com/photo-1588979355313-6711a0954656?w=400&h=300&fit=crop',
            notes: ['نمو غزير ورائحة فواحة جداً بعد التسميد العضوي بالكومبوست.'],
            scans: [],
          },
          {
            name: 'ليمون شهري (حوض الزاوية)',
            type: 'Fruit Tree',
            planting_date: '2025-01-10',
            health_status: 'Critical',
            photo_url: 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=400&h=300&fit=crop',
            notes: ['التفاف كامل للأوراق مع مسارات متعرجة شفافة وفقدان النشاط.'],
            scans: [
              {
                diagnosis: 'صانعات الأنفاق في الحمضيات (Citrus Leafminer)',
                confidence: 91.2,
                severity: 'High',
                symptoms: 'أنفاق فضية متعرجة داخل سماكة الورقة، تلتف الأوراق وتتقزم القمم النامية وتجف الأطراف.',
                treatment: {
                  type: 'Citrus Leafminer',
                  organic_steps: [
                    'تقليم الأغصان الغضة المصابة والتخلص منها فوراً لتفادي فقس اليرقات.',
                    'رش الزيوت البستانية العضوية الخفيفة لتغطية البيوض وخنقها.',
                  ],
                  chemical_steps: [
                    'رش مبيد أبامكتين (Abamectin) بالملامسة مع إضافة زيت صيفي لزيادة النفاذية.',
                  ],
                  status: 'Pending',
                },
              },
            ],
          },
        ],
      },
    ],
  },
];

async function seed() {
  console.log('--- STARTING DATABASE SEEDING PROCESS ---');

  try {
    // 3. Clean existing seed users (emails ending with @agriscan.ai)
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
      perPage: 100,
    });

    if (listError) throw listError;

    if (listData && listData.users) {
      for (const u of listData.users) {
        if (u.email && u.email.endsWith('@agriscan.ai')) {
          console.log(`Cleaning old seed user: ${u.email}`);
          await supabase.auth.admin.deleteUser(u.id);
        }
      }
    }

    const createdUsersData = [];

    // 4. Create and populate seed users
    for (const u of mockUsers) {
      console.log(`Creating user: ${u.email}`);
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: {
          name: u.name,
          account_type: u.accountType,
          avatar_url: u.avatarUrl,
        },
      });

      if (authError) {
        console.error(`Failed to create ${u.email}:`, authError.message);
        continue;
      }

      const userId = authUser.user.id;
      createdUsersData.push({ id: userId, name: u.name, email: u.email });

      // Update additional profile settings (triggers created public.profiles row)
      console.log(`Updating profile meta for user ID: ${userId}`);
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          location: u.location,
          units: u.units,
          plan: u.plan,
        })
        .eq('id', userId);

      if (profileError) {
        console.error(`Error updating profile for ${u.email}:`, profileError.message);
      }

      // Add Farms, Plants, Scans, Treatments, Notes
      for (const f of u.farms) {
        console.log(`Creating Farm "${f.name}" for user ${u.name}`);
        const { data: farm, error: farmError } = await supabase
          .from('farms')
          .insert({
            name: f.name,
            zone_count: f.zone_count,
            user_id: userId,
          })
          .select()
          .single();

        if (farmError) {
          console.error(`Error creating farm:`, farmError.message);
          continue;
        }

        for (const p of f.plants) {
          console.log(`Adding plant "${p.name}"`);
          const { data: plant, error: plantError } = await supabase
            .from('plants')
            .insert({
              name: p.name,
              type: p.type,
              planting_date: p.planting_date,
              health_status: p.health_status,
              photo_url: p.photo_url,
              farm_id: farm.id,
              user_id: userId,
            })
            .select()
            .single();

          if (plantError) {
            console.error(`Error adding plant:`, plantError.message);
            continue;
          }

          // Add notes
          if (p.notes && p.notes.length > 0) {
            for (const noteContent of p.notes) {
              await supabase.from('notes').insert({
                plant_id: plant.id,
                user_id: userId,
                content: noteContent,
              });
            }
          }

          // Add scans and treatments
          if (p.scans && p.scans.length > 0) {
            for (const s of p.scans) {
              console.log(`Adding scan and treatment for plant ${p.name}`);
              const { data: scan, error: scanError } = await supabase
                .from('scans')
                .insert({
                  plant_id: plant.id,
                  user_id: userId,
                  image_url: p.photo_url,
                  diagnosis: s.diagnosis,
                  confidence: s.confidence,
                  severity: s.severity,
                  symptoms: s.symptoms,
                })
                .select()
                .single();

              if (scanError) {
                console.error(`Error adding scan:`, scanError.message);
                continue;
              }

              if (s.treatment) {
                await supabase.from('treatments').insert({
                  scan_id: scan.id,
                  plant_id: plant.id,
                  user_id: userId,
                  type: s.treatment.type,
                  organic_steps: s.treatment.organic_steps,
                  chemical_steps: s.treatment.chemical_steps,
                  status: s.treatment.status,
                });
              }
            }
          }
        }
      }
    }

    // 5. Seed forum posts and comments
    if (createdUsersData.length >= 2) {
      console.log('Seeding Community Forum Posts...');
      const user1 = createdUsersData[0]; // Ahmed
      const user2 = createdUsersData[1]; // Nora

      // Post 1 by Ahmed
      const { data: post1, error: post1Error } = await supabase
        .from('forum_posts')
        .insert({
          title: 'تجربتي في مكافحة سوسة النخيل الحمراء بالحقن العضوي المباشر',
          content:
            'السلام عليكم ورحمة الله وبركاته، أود أن أشارك زملائي المزارعين تجربتي الناجحة في علاج نخلة سكري أصيبت بسوسة النخيل في مراحلها المبكرة. قمت بحقن الجذع بخلاصة زيت النيم والثوم المركز تحت إشراف زراعي، والحمد لله توقف نشاط السوسة تماماً وبدأت النخلة تستعيد عافيتها. أنصح الجميع بالفحص الدوري للجذوع والتدخل المبكر والوقاية المستمرة.',
          user_id: user1.id,
          author_name: user1.name,
          category: 'Tips',
        })
        .select()
        .single();

      if (post1Error) {
        console.error('Error seeding post 1:', post1Error.message);
      } else {
        // Comments for Post 1
        await supabase.from('forum_comments').insert([
          {
            post_id: post1.id,
            content: 'ما شاء الله تبارك الله، تجربة ممتازة أبو محمد. هل قمت بإغلاق الفتحات بعد الحقن بمادة الجير والطين؟',
            user_id: user2.id,
            author_name: user2.name,
          },
          {
            post_id: post1.id,
            content: 'نعم أخت نورة، ضروري جداً إغلاق فتحات السوسة بالكامل لمنع خروج الحشرات البالغة أو وضع بيوض جديدة.',
            user_id: user1.id,
            author_name: user1.name,
          },
        ]);
      }

      // Post 2 by Nora
      const { data: post2, error: post2Error } = await supabase
        .from('forum_posts')
        .insert({
          title: 'انتشار سريع لمرض البياض الدقيقي على شتلات الورد الجوري بمشتل تبوك',
          content:
            'نواجه هذا الأسبوع تحدي كبير مع انتشار الفطريات والبياض الدقيقي على شتلات الورد الجوري الفتية بالبيوت المحمية، والسبب الرئيسي هو ارتفاع الرطوبة النسبية خلال ساعات الصباح الأولى مع انخفاض درجات الحرارة فجراً. قمنا حالياً بزيادة التهوية والرش الوقائي بزيت النيم. هل من مقترحات إضافية؟',
          user_id: user2.id,
          author_name: user2.name,
          category: 'Diseases',
        })
        .select()
        .single();

      if (post2Error) {
        console.error('Error seeding post 2:', post2Error.message);
      } else {
        // Comments for Post 2
        await supabase.from('forum_comments').insert([
          {
            post_id: post2.id,
            content:
              'أهلاً أخت نورة. أنصح وبشدة بتشغيل مراوح سحب الرطوبة قبل شروق الشمس بساعتين، وتقليل التسميد النيتروجيني مؤقتاً لتقليل الأنسجة الطرية القابلة للإصابة.',
            user_id: user1.id,
            author_name: user1.name,
          },
        ]);
      }
    }

    console.log('--- DATABASE SEEDING COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Database seeding failed with error:', err);
  }
}

seed();
