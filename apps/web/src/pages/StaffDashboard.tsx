import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  ShoppingCart, Sparkles, Calendar, Clock, FileText,
  TrendingUp, CheckCircle, AlertCircle, ArrowRight,
  Package, User, ChevronRight,
} from 'lucide-react';
import { useStore } from '../data/store';
import { useAuth } from '../components/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const TODAY       = '2026-02-26';
const TODAY_LABEL = 'Thursday, February 26, 2026';

const STATUS_STYLES: Record<string, { pill: string; dot: string }> = {
  draft:     { pill: 'bg-gray-100 text-gray-600',      dot: 'bg-gray-400' },
  pending:   { pill: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-400' },
  approved:  { pill: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  rejected:  { pill: 'bg-red-100 text-red-500',        dot: 'bg-red-400' },
  scheduled: { pill: 'bg-blue-100 text-blue-700',      dot: 'bg-blue-400' },
  published: { pill: 'bg-purple-100 text-purple-700',  dot: 'bg-purple-400' },
};

const PLATFORM_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  facebook:  'Facebook',
  both:      'IG + FB',
};

const PLATFORM_COLOR: Record<string, string> = {
  instagram: 'bg-pink-500',
  facebook:  'bg-blue-500',
  both:      'bg-purple-500',
};

// ─── Quick Action Card ────────────────────────────────────────────────────────
function QuickActionCard({
  icon: Icon,
  label,
  description,
  gradient,
  iconBg,
  iconColor,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  gradient: string;
  iconBg: string;
  iconColor: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left rounded-xl border border-[#E5E7EB] bg-white p-5 hover:border-[#F9A8C0] hover:shadow-md transition-all duration-200 active:scale-[0.98] overflow-hidden"
    >
      {/* Gradient accent strip */}
      <div
        className="absolute inset-x-0 top-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-xl"
        style={{ background: gradient }}
      />
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-3`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <ChevronRight className="w-4 h-4 text-[#D1D5DB] group-hover:text-[#EC4899] group-hover:translate-x-0.5 transition-all mt-1" />
      </div>
      <p className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>{label}</p>
      <p className="text-[#9CA3AF] text-xs mt-0.5">{description}</p>
    </button>
  );
}

// ─── KPI Mini Stat ────────────────────────────────────────────────────────────
function MiniStat({
  label, value, icon: Icon, iconBg, iconColor, note,
}: {
  label: string; value: string; icon: React.ElementType;
  iconBg: string; iconColor: string; note?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] px-5 py-4 flex items-center gap-4">
      <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4.5 h-4.5 ${iconColor}`} style={{ width: 18, height: 18 }} />
      </div>
      <div className="min-w-0">
        <p className="text-lg text-[#111827]" style={{ fontWeight: 700 }}>{value}</p>
        <p className="text-[10px] text-[#6B7280]">{label}</p>
        {note && <p className="text-[10px] text-[#9CA3AF]">{note}</p>}
      </div>
    </div>
  );
}

// ─── Section Card Shell ───────────────────────────────────────────────────────
function SectionCard({
  title, sub, badge, children,
}: {
  title: string; sub?: string; badge?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
        <div>
          <h3 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>{title}</h3>
          {sub && <p className="text-[#9CA3AF] text-xs mt-0.5">{sub}</p>}
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function Empty({ message }: { message: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-xs text-[#9CA3AF]">{message}</p>
    </div>
  );
}

// ─── Staff Dashboard ──────────────────────────────────────────────────────────
export default function StaffDashboard() {
  const { sales, products, contentItems } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Today's sales ──────────────────────────────────────────────────────
  const todaySales = useMemo(
    () => sales.filter(s => s.date === TODAY),
    [sales]
  );
  const todayRevenue   = todaySales.reduce((sum, s) => sum + s.total, 0);
  const todayProfit    = todaySales.reduce((sum, s) => sum + s.profit, 0);
  const todayUnits     = todaySales.reduce((sum, s) => sum + s.quantity, 0);

  // ── My drafts (content created by staff role) ──────────────────────────
  const myDrafts = useMemo(
    () =>
      contentItems
        .filter(c => c.createdByRole === 'staff' &&
          ['draft', 'pending', 'rejected'].includes(c.status))
        .slice(0, 6),
    [contentItems]
  );

  // ── Upcoming scheduled posts ───────────────────────────────────────────
  const upcomingPosts = useMemo(
    () =>
      contentItems
        .filter(c => c.status === 'scheduled')
        .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''))
        .slice(0, 5),
    [contentItems]
  );

  // ── Low stock warning count (for context) ─────────────────────────────
  const lowStockCount = products.filter(p => p.stock <= p.lowStockThreshold).length;

  // ── Draft needs-action counts ─────────────────────────────────────────
  const pendingCount  = myDrafts.filter(c => c.status === 'pending').length;
  const rejectedCount = myDrafts.filter(c => c.status === 'rejected').length;

  return (
    <div className="space-y-5 pb-6">

      {/* ── Welcome Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[#111827] text-xl" style={{ fontWeight: 700 }}>
            Good morning, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-[#6B7280] text-sm mt-0.5">{TODAY_LABEL}</p>
        </div>
        {/* Subtle role badge */}
        <span className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 bg-[#FCE7F3] text-[#EC4899] rounded-full border border-[#F9A8C0]/40 mt-1">
          <User className="w-3 h-3" />
          Staff
        </span>
      </div>

      {/* ── Quick Action Buttons ─────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-3">Quick Actions</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickActionCard
            icon={ShoppingCart}
            label="Record a Sale"
            description="Log a new customer transaction"
            gradient="linear-gradient(90deg, #EC4899, #F9A8C0)"
            iconBg="bg-[#FCE7F3]"
            iconColor="text-[#EC4899]"
            onClick={() => navigate('/sales')}
          />
          <QuickActionCard
            icon={Sparkles}
            label="Generate Content"
            description="Use AI to create marketing copy"
            gradient="linear-gradient(90deg, #D4A373, #F5C49A)"
            iconBg="bg-[#FEF3C7]"
            iconColor="text-[#D97706]"
            onClick={() => navigate('/marketing')}
          />
          <QuickActionCard
            icon={Calendar}
            label="Schedule a Post"
            description="Pick a date & platform to publish"
            gradient="linear-gradient(90deg, #4A90D9, #7BB3F0)"
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            onClick={() => navigate('/scheduling')}
          />
        </div>
      </div>

      {/* ── KPI Mini Stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat
          label="Sales Today"
          value={String(todaySales.length)}
          icon={ShoppingCart}
          iconBg="bg-[#FCE7F3]"
          iconColor="text-[#EC4899]"
          note={`${todayUnits} units`}
        />
        <MiniStat
          label="Revenue Today"
          value={`₱${todayRevenue.toFixed(2)}`}
          icon={TrendingUp}
          iconBg="bg-[#FEF9C3]"
          iconColor="text-[#D97706]"
          note={`₱${todayProfit.toFixed(2)} profit`}
        />
        <MiniStat
          label="My Drafts"
          value={String(myDrafts.length)}
          icon={FileText}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          note={rejectedCount > 0 ? `${rejectedCount} rejected` : pendingCount > 0 ? `${pendingCount} pending` : 'All clear'}
        />
        <MiniStat
          label="Scheduled Posts"
          value={String(upcomingPosts.length)}
          icon={Calendar}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          note="upcoming"
        />
      </div>

      {/* ── Alerts row ───────────────────────────────────────────────────── */}
      {(rejectedCount > 0 || lowStockCount > 0) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {rejectedCount > 0 && (
            <button
              onClick={() => navigate('/marketing')}
              className="flex-1 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-left hover:border-red-200 transition-colors group"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-700 flex-1">
                <span style={{ fontWeight: 600 }}>{rejectedCount} draft{rejectedCount > 1 ? 's' : ''} rejected</span>
                {' '}— tap to review and revise.
              </p>
              <ArrowRight className="w-3.5 h-3.5 text-red-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          )}
          {lowStockCount > 0 && (
            <button
              onClick={() => navigate('/products')}
              className="flex-1 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-left hover:border-amber-200 transition-colors group"
            >
              <Package className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 flex-1">
                <span style={{ fontWeight: 600 }}>{lowStockCount} product{lowStockCount > 1 ? 's' : ''} low on stock</span>
                {' '}— check inventory.
              </p>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          )}
        </div>
      )}

      {/* ── Main Content: Today's Sales + My Drafts ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Today's Sales Summary */}
        <div className="lg:col-span-3">
          <SectionCard
            title="Today's Sales"
            sub={`${todaySales.length} transaction${todaySales.length !== 1 ? 's' : ''} · ₱${todayRevenue.toFixed(2)} total`}
            badge={
              todaySales.length > 0 ? (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                  <CheckCircle className="w-3 h-3" />
                  Active
                </span>
              ) : undefined
            }
          >
            {todaySales.length === 0 ? (
              <Empty message="No sales recorded today yet. Tap 'Record a Sale' to get started." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F9FAFB]">
                      {['Product', 'Customer', 'Qty', 'Total'].map(h => (
                        <th
                          key={h}
                          className={`px-4 py-2.5 text-[10px] text-[#9CA3AF] uppercase tracking-wider ${h === 'Qty' || h === 'Total' ? 'text-right' : 'text-left'}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {todaySales.map((s, i) => (
                      <tr
                        key={s.id}
                        className={`border-t border-[#F3F4F6] ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}
                      >
                        <td className="px-4 py-3">
                          <p className="text-xs text-[#111827] truncate max-w-[130px]" style={{ fontWeight: 500 }}>
                            {s.productName}
                          </p>
                          <p className="text-[10px] text-[#9CA3AF]">{s.category}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#6B7280] truncate max-w-[100px]">
                          {s.customerName}
                        </td>
                        <td className="px-4 py-3 text-xs text-right text-[#374151]">
                          ×{s.quantity}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-xs text-[#111827]" style={{ fontWeight: 600 }}>
                            ₱{s.total.toFixed(2)}
                          </p>
                          <p className="text-[10px] text-emerald-500">
                            +₱{s.profit.toFixed(2)}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals footer */}
                  <tfoot>
                    <tr className="border-t-2 border-[#E5E7EB] bg-[#F9FAFB]">
                      <td colSpan={2} className="px-4 py-2.5 text-xs text-[#6B7280]" style={{ fontWeight: 500 }}>
                        {todaySales.length} transaction{todaySales.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-[#374151]">{todayUnits} units</td>
                      <td className="px-4 py-2.5 text-right">
                        <p className="text-xs text-[#111827]" style={{ fontWeight: 700 }}>
                          ₱{todayRevenue.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-emerald-500">₱{todayProfit.toFixed(2)} profit</p>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </SectionCard>
        </div>

        {/* My Marketing Drafts */}
        <div className="lg:col-span-2">
          <SectionCard
            title="My Marketing Drafts"
            sub="Content you've submitted"
            badge={
              myDrafts.length > 0 ? (
                <span className="text-[10px] px-2 py-0.5 bg-[#FCE7F3] text-[#EC4899] rounded-full">
                  {myDrafts.length}
                </span>
              ) : undefined
            }
          >
            {myDrafts.length === 0 ? (
              <Empty message="No drafts yet. Use AI Marketing to generate content." />
            ) : (
              <div className="divide-y divide-[#F3F4F6]">
                {myDrafts.map(c => {
                  const styles = STATUS_STYLES[c.status] ?? STATUS_STYLES.draft;
                  return (
                    <div key={c.id} className="px-5 py-3.5">
                      {/* Platform + Status row */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded text-white ${PLATFORM_COLOR[c.platform] ?? 'bg-gray-400'}`}
                          style={{ fontWeight: 600 }}
                        >
                          {PLATFORM_LABEL[c.platform]}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${styles.pill}`}>
                          {c.status}
                        </span>
                        {c.status === 'rejected' && (
                          <span className="text-[10px] text-red-400 ml-auto">Needs revision</span>
                        )}
                        {c.status === 'pending' && (
                          <span className="text-[10px] text-amber-500 ml-auto flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            Awaiting
                          </span>
                        )}
                      </div>
                      {/* Title */}
                      <p className="text-xs text-[#111827] truncate" style={{ fontWeight: 500 }}>
                        {c.title}
                      </p>
                      {/* Rejection reason */}
                      {c.rejectionReason && (
                        <p className="text-[10px] text-red-400 mt-1 line-clamp-2">
                          "{c.rejectionReason}"
                        </p>
                      )}
                      {/* Product tag */}
                      {c.productName && !c.rejectionReason && (
                        <p className="text-[10px] text-[#9CA3AF] mt-0.5">{c.productName}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Navigate CTA */}
            <div className="px-5 py-3 border-t border-[#F3F4F6]">
              <button
                onClick={() => navigate('/marketing')}
                className="flex items-center gap-1.5 text-xs text-[#EC4899] hover:text-[#DB2777] transition-colors group"
              >
                Go to AI Marketing
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Upcoming Scheduled Posts ─────────────────────────────────────── */}
      <SectionCard
        title="Upcoming Scheduled Posts"
        sub="Approved content ready to publish"
        badge={
          upcomingPosts.length > 0 ? (
            <button
              onClick={() => navigate('/scheduling')}
              className="flex items-center gap-1 text-xs text-[#EC4899] hover:text-[#DB2777] transition-colors group"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : undefined
        }
      >
        {upcomingPosts.length === 0 ? (
          <Empty message="No scheduled posts. Go to Scheduling to set publish dates." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-[#F3F4F6]">
            {upcomingPosts.map(c => (
              <div key={c.id} className="px-5 py-4 flex flex-col gap-2">
                {/* Header */}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[9px] shrink-0 ${PLATFORM_COLOR[c.platform] ?? 'bg-gray-400'}`}
                    style={{ fontWeight: 700 }}
                  >
                    {c.platform === 'instagram' ? 'IG' : c.platform === 'facebook' ? 'FB' : '✦'}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[c.status]?.pill ?? ''}`}>
                    {c.status}
                  </span>
                </div>

                {/* Title */}
                <p className="text-xs text-[#111827] line-clamp-2" style={{ fontWeight: 500 }}>
                  {c.title}
                </p>

                {/* Scheduled date */}
                <div className="flex items-center gap-1.5 mt-auto">
                  <Clock className="w-3 h-3 text-[#9CA3AF]" />
                  <p className="text-[10px] text-[#6B7280]">
                    {c.scheduledAt
                      ? new Date(c.scheduledAt).toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                        })
                      : 'Date TBD'}
                  </p>
                </div>

                {/* Product */}
                {c.productName && (
                  <p className="text-[10px] text-[#9CA3AF] flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {c.productName}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

    </div>
  );
}
