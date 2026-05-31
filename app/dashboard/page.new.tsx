// app/dashboard/page.new.tsx
'use client';

import { useEffect, useState } from 'react';
import { useUserRole } from '@/lib/useUserRole';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  Package, AlertTriangle, Clock, CheckCircle, Wrench,
  TrendingUp, ArrowRight, Eye, Filter, MapPin, Factory,
  Droplet, Settings, Calendar, Users, DollarSign, FileText, Smartphone
} from 'lucide-react';
import DashboardCharts from '@/components/DashboardCharts';

const supabase = createSupabaseBrowserClient();

export default function DashboardNew() {
  const { role, companyCode, isAdmin, isTopManagement, isFieldManager, isSupervisor, isCrew, isClient, loading: roleLoading } = useUserRole();
  
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && role) {
      fetchDashboardData();
    }
  }, [roleLoading, role, companyCode]);

  async function fetchDashboardData() {
    setLoading(true);
    setError(null);
    try {
      console.log('🔍 GHARIB GULF SYSTEM: Fetching financial and operational data...');
      
      // جلب البيانات الأساسية من الأصول وأوامر العمل لعمل الحسابات الديناميكية
      const { data: assets, error: assetsErr } = await supabase.from('assets').select('*');
      const { data: workOrders, error: woErr } = await supabase.from('work_orders').select('*');

      if (assetsErr || woErr) throw assetsErr || woErr;

      // حسابات تجريبية بناءً على أرقام مناقصة خالدة الفعلية (905,038 ج.م كإجمالي مستهدف)
      const totalValvesTarget = 3680; // 3558 محطات + 122 حريق
      const targetBudget = 905038; 
      
      const completedValves = assets?.filter(a => a.condition === 'good' || a.maintenance_status === 'completed').length || 0;
      const completionRate = totalValvesTarget > 0 ? (completedValves / totalValvesTarget) : 0;
      
      // احتساب الإنجاز المالي الديناميكي بناءً على نسبة الصمامات المنجزة فعلياً
      const achievedBudget = Math.round(targetBudget * completionRate);

      setDashboardData({
        totalValves: totalValvesTarget,
        completedValves: completedValves,
        pendingValves: totalValvesTarget - completedValves,
        targetBudget: targetBudget,
        achievedBudget: achievedBudget,
        activeCrews: 4, // فرق عمل حقل الكرامة
        pendingOrders: workOrders?.filter(w => w.status === 'pending' || w.status === 'assigned').length || 0,
        inProgressOrders: workOrders?.filter(w => w.status === 'in_progress').length || 0,
        completedOrders: workOrders?.filter(w => w.status === 'completed').length || 0,
      });

    } catch (err: any) {
      console.error('❌ Error fetching dashboard data:', err);
      setError(err.message || 'حدث خطأ أثناء تحميل لوحة القيادة');
    } finally {
      setLoading(false);
    }
  }

  if (roleLoading || loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-amber-500 mx-auto"></div>
          <p className="mt-4 text-navy-400 font-medium animate-pulse">جاري تحميل نظام GHARIB GULF SYSTEM...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-xl mx-auto mt-10 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-red-200">فشل في الاتصال بقاعدة البيانات</h3>
        <p className="text-red-400 text-sm mt-1">{error}</p>
        <button onClick={fetchDashboardData} className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition">
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto text-right" dir="rtl">
      
      {/* هيدر ترحيبي مع هوية النظام */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-navy-800 pb-5">
        <div>
          <span className="text-xs font-bold tracking-widest text-amber-500 uppercase">لوحة القيادة المركزية</span>
          <h1 className="text-3xl font-black text-white mt-1 font-sans">GHARIB GULF SYSTEM</h1>
          <p className="text-navy-400 text-sm mt-1">مشروع إدارة صيانة صمامات ورؤوس آبار حقول شركة خالدة للبترول</p>
        </div>
        <div className="flex items-center gap-3 bg-navy-900 border border-navy-800 px-4 py-2 rounded-xl">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-ping"></div>
          <span className="text-xs text-navy-300 font-medium">مستطاع الصلاحية: <strong className="text-amber-400 uppercase">{role?.replace('_', ' ')}</strong></span>
        </div>
      </div>

      {/* 🌟 قسم روابط الانطلاق السريع والتحكم المركزي (The Navigation Hub) */}
      <div>
        <h2 className="text-lg font-bold text-navy-200 mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5 text-amber-500" />
          بوابة التحكم والانطلاق السريع للبرنامج
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <QuickLinkCard 
            title="سجل الأصول والصمامات" 
            description="إدارة ومراقبة 3,680 صمام، تحديث الـ SCT وفلاتر المواصفات والبحث."
            href="/assets" 
            icon={<Package className="h-6 w-6 text-blue-400" />}
            badge="تصفح وتصدير"
            color="border-blue-500/20 hover:border-blue-500/40"
          />

          <QuickLinkCard 
            title="أوامر العمل (Work Orders)" 
            description="متابعة الـ 113 أمر عمل الصادرة، تعيين الطواقم، وطباعة التقارير."
            href="/work-orders" 
            icon={<FileText className="h-6 w-6 text-purple-400" />}
            badge="إدارة التشغيل"
            color="border-purple-500/20 hover:border-purple-500/40"
          />

          {(isAdmin || isTopManagement || isFieldManager || isSupervisor) && (
            <QuickLinkCard 
              title="التكليفات اليومية" 
              description="توزيع الصمامات المستهدفة (30 صمام/يوم) وإنشاء المهام اليومية للفرق."
              href="/daily-assignments" 
              icon={<Calendar className="h-6 w-6 text-amber-400" />}
              badge="التخطيط الميداني"
              color="border-amber-500/20 hover:border-amber-500/40"
            />
          )}

          <QuickLinkCard 
            title="بوابة الفنيين (تطبيق الموبايل)" 
            description="الواجهة الميدانية المخصصة للهواتف: التقاط صور الصيانة، ورفع الـ GPS."
            href="/mobile/tasks" 
            icon={<Smartphone className="h-6 w-6 text-green-400" />}
            badge="شاشة الميدان / PWA"
            color="border-green-500/20 hover:border-green-500/40"
          />

        </div>
      </div>

      {/* البطاقات الرقمية ومؤشرات الأداء المالي والفني (Financial & Operational KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* الكرت المالي - إجمالي قيمة العقد المنجزة */}
        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-[4px] w-full bg-gradient-to-l from-green-500 to-emerald-600"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-navy-400">المستخلص المالي المنجز (عقد خالدة)</p>
              <h3 className="text-2xl font-black text-white mt-2 font-mono">
                {dashboardData.achievedBudget.toLocaleString()} <span className="text-xs text-green-400 font-sans">ج.م</span>
              </h3>
            </div>
            <div className="p-3 bg-green-500/10 rounded-xl text-green-400">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-navy-800/60 flex justify-between items-center text-xs text-navy-400">
            <span>القيمة المستهدفة الكلية:</span>
            <span className="font-mono text-navy-200">{dashboardData.targetBudget.toLocaleString()} ج.م</span>
          </div>
        </div>

        {/* كرت تقدم العمل الفعلي للصمامات */}
        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-[4px] w-full bg-gradient-to-l from-amber-500 to-orange-600"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-navy-400">إجمالي الصمامات المنجزة</p>
              <h3 className="text-2xl font-black text-white mt-2 font-mono">
                {dashboardData.completedValves} <span className="text-xs text-navy-500 font-sans">/ {dashboardData.totalValves}</span>
              </h3>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
              <CheckCircle className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-navy-800/60 text-xs flex justify-between items-center">
            <span className="text-navy-400">نسبة الإنجاز الفني للمشروع:</span>
            <span className="text-amber-400 font-bold font-mono">
              {Math.round((dashboardData.completedValves / dashboardData.totalValves) * 100)}%
            </span>
          </div>
        </div>

        {/* كرت حالة أوامر العمل القائمة */}
        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-[4px] w-full bg-gradient-to-l from-blue-500 to-indigo-600"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-navy-400">أوامر العمل قيد التنفيذ</p>
              <h3 className="text-2xl font-black text-white mt-2 font-mono">{dashboardData.inProgressOrders}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
              <Wrench className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-navy-800/60 text-xs text-navy-400 flex justify-between">
            <span>في الانتظار: <strong className="text-navy-200 font-mono">{dashboardData.pendingOrders}</strong></span>
            <span>مكتملة: <strong className="text-green-400 font-mono">{dashboardData.completedOrders}</strong></span>
          </div>
        </div>

        {/* كرت المتبقي والمستهدف */}
        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-[4px] w-full bg-gradient-to-l from-purple-500 to-pink-600"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-navy-400">صمامات متبقية للفحص</p>
              <h3 className="text-2xl font-black text-white mt-2 font-mono">{dashboardData.pendingValves}</h3>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
              <Clock className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-navy-800/60 text-xs text-navy-400 flex justify-between items-center">
            <span>طواقم صيانة الحقل النشطة:</span>
            <span className="font-mono bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded">{dashboardData.activeCrews} فرق</span>
          </div>
        </div>

      </div>

      {/* قسم التحليلات والرسوم البيانية الهندسية */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* الرسم البياني الممتد عبر عمودين */}
        <div className="lg:col-span-2 bg-navy-900 border border-navy-800 p-5 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-white">منحنى تقدم صيانة المحطات المالي والفيزيائي</h3>
              <p className="text-xs text-navy-400 mt-0.5">مقارنة خطة الإنجاز الفعلية بالمستهدف اليومي لعقد خالدة</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-navy-300">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span> المنجز ماليّاً
              </span>
              <span className="flex items-center gap-1.5 text-navy-300">
                <span className="h-2 w-2 rounded-full bg-blue-500"></span> عدد الصمامات
              </span>
            </div>
          </div>
          <div className="h-80 w-full">
            <DashboardCharts data={dashboardData} />
          </div>
        </div>

        {/* توزيع أحمال الصمامات حسب المحطة ماليّاً وفنيّاً */}
        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-1">توزيع صمامات محطات الكرامة</h3>
            <p className="text-xs text-navy-400 mb-4">الأصول والنسب المالية المستهدفة لكل منطقة حقلية</p>
            
            <div className="space-y-3">
              <StationProgressRow label="محطات نفط الكرامة (Karama Stations)" value={3558} percent={96.7} money="872,917 ج.م" />
              <StationProgressRow label="شبكة الإطفاء والحريق (Karama CPF)" value={122} percent={3.3} money="32,121 ج.م" />
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-navy-800 bg-navy-950/40 p-3 rounded-xl text-xs text-navy-400 leading-relaxed">
            <span className="text-amber-500 font-bold block mb-1">💡 ملحوظة تجارية:</span>
            بإمكان المشرف إصدار المستخلصات والتقارير المالية الفورية للمحطات المكتملة لتقديمها مباشرة لإدارة شركة خالدة عبر صفحة أوامر العمل.
          </div>
        </div>

      </div>

    </div>
  );
}

{/* 🛠️ المكون البرمجي الفرعي لكروت التحكم والانطلاق السريع */}
function QuickLinkCard({ title, description, href, icon, badge, color }: any) {
  return (
    <Link href={href} className={`block bg-navy-900 border p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:bg-navy-850/60 ${color} group`}>
      <div className="flex justify-between items-start mb-3">
        <div className="p-2.5 bg-navy-950 rounded-xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <span className="text-[10px] font-bold bg-navy-950 px-2 py-1 rounded-md text-navy-400 border border-navy-800">
          {badge}
        </span>
      </div>
      <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
        {title}
        <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-amber-400 rotate-180" />
      </h3>
      <p className="text-xs text-navy-400 mt-1.5 leading-relaxed">
        {description}
      </p>
    </Link>
  );
}

{/* 🛠️ المكون البرمجي الفرعي لسطور توزيع المحطات */}
function StationProgressRow({ label, value, percent, money }: any) {
  return (
    <div className="p-3 bg-navy-950/50 border border-navy-850 rounded-xl flex justify-between items-center">
      <div>
        <span className="text-white text-xs font-bold block">{label}</span>
        <span className="text-[11px] text-navy-400 font-mono mt-0.5 block">{money}</span>
      </div>
      <div className="text-left">
        <span className="text-amber-400 font-mono font-bold text-sm block">{value.toLocaleString()}</span>
        <span className="text-navy-500 text-[10px] font-mono block">({percent}%)</span>
      </div>
    </div>
  );
}