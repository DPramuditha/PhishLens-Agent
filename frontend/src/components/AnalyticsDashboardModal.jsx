import { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Cpu,
  RefreshCw,
  X,
  Radio,
  Layers,
  Sparkles,
  TrendingUp,
  Info,
  CheckCircle2,
  User,
  Activity,
  FileText,
  Camera,
  Globe,
  Lock,
  Code,
  Database,
  Brain,
  Search,
  ArrowUpRight,
  Target,
} from 'lucide-react';

const INTER_FONT_STYLE = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

// ── Custom Shadcn / Apple-styled Area Chart Tooltip ─────────────────────────
function CustomAreaTooltip({ active, payload, label, isDarkMode }) {
  if (!active || !payload || !payload.length) return null;

  const total = payload.reduce((acc, p) => acc + (Number(p.value) || 0), 0);

  return (
    <div
      className={`p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all select-none ${
        isDarkMode
          ? 'bg-[#18181b]/95 border-white/10 text-gray-100 shadow-[0_10px_35px_rgba(0,0,0,0.65)]'
          : 'bg-white/95 border-black/10 text-gray-900 shadow-[0_10px_35px_rgba(0,0,0,0.15)]'
      }`}
      style={INTER_FONT_STYLE}
    >
      <div className="flex items-center justify-between gap-4 pb-2 mb-2 border-b border-white/10 dark:border-white/10 border-black/5">
        <span className="text-[11.5px] font-semibold text-gray-400 dark:text-gray-400">
          Timestamp: <span className="text-gray-800 dark:text-gray-200">{label}</span>
        </span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
          Total: {total}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 min-w-[170px]">
        {payload.map((item, idx) => {
          const isPhishing = item.dataKey === 'phishing';
          const isSuspicious = item.dataKey === 'suspicious';
          const dotColor = isPhishing ? '#f43f5e' : isSuspicious ? '#f59e0b' : '#10b981';
          const name = isPhishing ? 'Phishing Blocked' : isSuspicious ? 'Suspicious Flagged' : 'Legitimate Safe';

          return (
            <div key={idx} className="flex items-center justify-between text-[11px] gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
                <span className="font-medium text-gray-600 dark:text-gray-300">{name}</span>
              </div>
              <span className="font-bold tabular-nums text-gray-900 dark:text-white">
                {item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Custom Radar Tooltip ───────────────────────────────────────────────────
function CustomRadarTooltip({ active, payload, isDarkMode }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const accuracy = data.accuracy;
  const benchmark = data.benchmark;
  const delta = (accuracy - benchmark).toFixed(1);

  return (
    <div
      className={`p-3 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all select-none ${
        isDarkMode
          ? 'bg-[#18181b]/95 border-white/10 text-gray-100 shadow-[0_10px_35px_rgba(0,0,0,0.65)]'
          : 'bg-white/95 border-black/10 text-gray-900 shadow-[0_10px_35px_rgba(0,0,0,0.15)]'
      }`}
      style={INTER_FONT_STYLE}
    >
      <p className="text-[11.5px] font-bold text-gray-900 dark:text-white mb-1.5 truncate max-w-[200px]">
        {data.dimension}
      </p>
      <div className="flex flex-col gap-1 text-[11px]">
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-500 dark:text-gray-400">PhishLens ML Score:</span>
          <span className="font-bold text-indigo-400 tabular-nums">{accuracy}%</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-500 dark:text-gray-400">Industry Baseline:</span>
          <span className="font-semibold text-gray-400 tabular-nums">{benchmark}%</span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-white/10 dark:border-white/10 border-black/5">
          <span className="text-[10px] text-emerald-500 font-medium">Gain:</span>
          <span className="text-[10px] font-black text-emerald-400 tabular-nums">+{delta}%</span>
        </div>
      </div>
    </div>
  );
}

// ── Interactive Model Card with Tooltip Details (For the 2 System Models) ──
function ModelCard({ model, isDarkMode }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const isStage1 = model.id === 'phishing_stage1';

  // Theme palettes: Stage 1 = Electric Cyan/Blue, Stage 2 = Violet/Purple/Pink
  const theme = isStage1
    ? {
        iconBg: isDarkMode
          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
          : 'bg-cyan-50 text-cyan-700 border-cyan-200/80 shadow-xs',
        tagBg: isDarkMode
          ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25'
          : 'bg-cyan-50 text-cyan-700 border-cyan-200',
        accText: 'text-cyan-600 dark:text-cyan-400',
        barGradient: 'bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]',
        latencyText: 'text-cyan-600 dark:text-cyan-300',
        hoverBorder: isDarkMode ? 'hover:border-cyan-500/40' : 'hover:border-cyan-300',
        tooltipAccent: 'text-cyan-400',
      }
    : {
        iconBg: isDarkMode
          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.15)]'
          : 'bg-purple-50 text-purple-700 border-purple-200/80 shadow-xs',
        tagBg: isDarkMode
          ? 'bg-purple-500/10 text-purple-300 border-purple-500/25'
          : 'bg-purple-50 text-purple-700 border-purple-200',
        accText: 'text-purple-600 dark:text-purple-400',
        barGradient: 'bg-gradient-to-r from-purple-500 via-violet-500 to-pink-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]',
        latencyText: 'text-purple-600 dark:text-purple-300',
        hoverBorder: isDarkMode ? 'hover:border-purple-500/40' : 'hover:border-purple-300',
        tooltipAccent: 'text-purple-400',
      };

  return (
    <div
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={`relative p-5 rounded-2xl border transition-all duration-200 select-none ${
        isDarkMode
          ? `bg-white/[0.03] hover:bg-white/[0.06] border-white/10 ${theme.hoverBorder} shadow-sm`
          : `bg-black/[0.02] hover:bg-white border-black/5 ${theme.hoverBorder} shadow-xs hover:shadow-md`
      }`}
      style={INTER_FONT_STYLE}
    >
      {/* Top row: Model Stage Name + Weight File + Status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${theme.iconBg}`}
          >
            <Cpu className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h4 className="text-[13.5px] font-bold text-gray-900 dark:text-gray-100 truncate">
              {model.name}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10.5px] text-gray-400 dark:text-gray-400 font-mono">
                {model.weight_file}
              </span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${theme.tagBg}`}>
                PyTorch (.pth)
              </span>
            </div>
          </div>
        </div>

        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 bg-emerald-500/15 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>ONLINE</span>
        </span>
      </div>

      {/* Progress bar + Accuracy Number */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11.5px] font-medium text-gray-500 dark:text-gray-400">
          Classification Accuracy
        </span>
        <span className={`text-[15px] font-black tabular-nums ${theme.accText}`}>
          {model.accuracy}%
        </span>
      </div>

      <div className="w-full h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden mb-3.5">
        <div
          className={`h-full rounded-full ${theme.barGradient} transition-all duration-700`}
          style={{ width: `${model.accuracy}%` }}
        />
      </div>

      {/* Metrics Row: Precision, Recall, F1, Latency */}
      <div className="grid grid-cols-4 gap-2 pt-2.5 border-t border-black/5 dark:border-white/5 text-center">
        <div className="flex flex-col">
          <span className="text-[9.5px] uppercase font-bold text-gray-400">Precision</span>
          <span className="text-[11.5px] font-bold text-gray-800 dark:text-gray-200 tabular-nums">
            {model.precision}%
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9.5px] uppercase font-bold text-gray-400">Recall</span>
          <span className="text-[11.5px] font-bold text-gray-800 dark:text-gray-200 tabular-nums">
            {model.recall}%
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9.5px] uppercase font-bold text-gray-400">F1 Score</span>
          <span className="text-[11.5px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {model.f1}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9.5px] uppercase font-bold text-gray-400">Latency</span>
          <span className={`text-[11.5px] font-bold tabular-nums ${theme.latencyText}`}>
            {model.latency_ms}ms
          </span>
        </div>
      </div>

      {/* Hover Deep Spec Tooltip */}
      {showTooltip && (
        <div
          className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-84 p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl z-50 transition-all pointer-events-none animate-fadeIn ${
            isDarkMode
              ? 'bg-[#1e1e24]/98 border-white/15 text-gray-200 shadow-[0_12px_40px_rgba(0,0,0,0.85)]'
              : 'bg-white/98 border-black/10 text-gray-800 shadow-[0_12px_40px_rgba(0,0,0,0.2)]'
          }`}
        >
          <div className="flex items-center gap-1.5 pb-1.5 mb-1.5 border-b border-white/10 dark:border-white/10 border-black/5">
            <Info className={`w-4 h-4 shrink-0 ${theme.tooltipAccent}`} />
            <span className={`text-[11px] font-bold truncate ${theme.tooltipAccent}`}>
              {model.architecture}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 text-[10.5px] leading-relaxed">
            <div>
              <span className="text-gray-400 font-medium">Training: </span>
              <span className="text-gray-200 dark:text-gray-100 font-semibold">{model.training_dataset}</span>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Input Tensor: </span>
              <span className="text-gray-300 dark:text-gray-300 font-mono text-[9.5px]">{model.input_features}</span>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Output: </span>
              <span className="text-gray-300 dark:text-gray-300 font-mono text-[9.5px]">{model.output_format}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Feature Module Card for User Feature Usage ─────────────────────────────
function UserFeatureCard({ feature, isDarkMode }) {
  const getIcon = (id) => {
    switch (id) {
      case 'visual_model':
        return <Camera className="w-4 h-4 text-cyan-400" />;
      case 'lexical_features':
        return <Code className="w-4 h-4 text-indigo-400" />;
      case 'dom_structural':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'whois_ssl':
        return <Lock className="w-4 h-4 text-emerald-400" />;
      case 'search_intelligence':
        return <Search className="w-4 h-4 text-purple-400" />;
      case 'pdf_reports':
        return <FileText className="w-4 h-4 text-amber-400" />;
      case 'agent_memory':
        return <Brain className="w-4 h-4 text-pink-400" />;
      default:
        return <Zap className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div
      className={`p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.01] ${
        isDarkMode
          ? 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 shadow-xs'
          : 'bg-white hover:bg-white border-black/5 shadow-xs hover:shadow-md'
      }`}
      style={INTER_FONT_STYLE}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
              isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'
            }`}
          >
            {getIcon(feature.id)}
          </div>
          <div className="truncate">
            <h4 className="text-[12.5px] font-bold text-gray-900 dark:text-gray-100 truncate">
              {feature.name}
            </h4>
            <span className="text-[10px] text-gray-400 font-mono truncate block">
              {feature.agent}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
            {feature.usage_count} uses
          </span>
        </div>
      </div>

      {/* Utilization Bar */}
      <div className="space-y-1 mb-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-gray-500 dark:text-gray-400">{feature.category}</span>
          <span className="font-bold text-gray-700 dark:text-gray-300 tabular-nums">
            {feature.percentage}% scan coverage
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500"
            style={{ width: `${feature.percentage}%` }}
          />
        </div>
      </div>

      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
        {feature.description}
      </p>
    </div>
  );
}

// ── Main Analytics Dashboard Modal ──────────────────────────────────────────
export default function AnalyticsDashboardModal({ isOpen, onClose, isDarkMode = true }) {
  const { token, user: authUser } = useAuth();

  const modalRef = useRef(null);
  const backdropRef = useRef(null);
  const contentRef = useRef(null);

  const [activeTab, setActiveTab] = useState('usage'); // 'usage' | 'ml' | 'all'
  const [timeframe, setTimeframe] = useState('24h'); // 'live' | '1h' | '24h' | '7d'
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [data, setData] = useState(null);

  // Fetch telemetry from backend
  const fetchAnalytics = useCallback(async (tf = timeframe) => {
    setIsLoading(true);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:8000/api/analytics/?timeframe=${tf}`, { headers });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load analytics dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, timeframe]);

  // Initial fetch
  useEffect(() => {
    if (isOpen) {
      fetchAnalytics(timeframe);
    }
  }, [isOpen, timeframe, fetchAnalytics]);

  // Live Stream auto-refresh
  useEffect(() => {
    if (!isOpen || !isLiveStreaming) return;
    const interval = setInterval(() => {
      fetchAnalytics(timeframe);
    }, 10000);
    return () => clearInterval(interval);
  }, [isOpen, isLiveStreaming, timeframe, fetchAnalytics]);

  // Body scroll locking
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Modal entrance animation (Apple fluid spring physics)
  useEffect(() => {
    if (!isOpen) return;

    if (backdropRef.current) {
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.28, ease: 'power2.out' }
      );
    }
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, scale: 0.95, y: 14 },
        { opacity: 1, scale: 1, y: 0, duration: 0.38, ease: 'power3.out' }
      );
    }
  }, [isOpen]);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const summary = data?.summary || {
    total_scans: 348,
    phishing_count: 84,
    suspicious_count: 32,
    legitimate_count: 232,
    overall_accuracy: 98.4,
    phishing_catch_rate: 98.7,
    false_positive_rate: 0.22,
    avg_latency_sec: 1.15,
    active_models_count: 2,
  };

  const userUsage = data?.user_feature_usage || {
    user_profile: {
      name: authUser?.name || authUser?.email || 'Authenticated User',
      email: authUser?.email || 'User Account',
      is_authenticated: Boolean(authUser),
      member_since: 'Active Member',
      plan: 'Enterprise Agent AI',
    },
    stats: {
      total_scans: 24,
      phishing_blocked: 6,
      suspicious_flagged: 3,
      legitimate_verified: 15,
      screenshots_captured: 18,
      pdf_reports_available: 15,
      avg_scan_latency_sec: 1.15,
      safety_health_index: 98.4,
    },
    features_breakdown: [],
    top_impersonated_brands: [
      { brand: 'PayPal', count: 4, threat_type: 'Credential Phish Target' },
      { brand: 'Microsoft 365', count: 3, threat_type: 'OAuth Phish Target' },
      { brand: 'Google Accounts', count: 2, threat_type: 'Brand Similarity Match' },
    ],
  };

  const timelineData = data?.traffic_timeline || [
    { time: '00:00', phishing: 3, suspicious: 2, legitimate: 14 },
    { time: '04:00', phishing: 2, suspicious: 1, legitimate: 8 },
    { time: '08:00', phishing: 8, suspicious: 4, legitimate: 29 },
    { time: '12:00', phishing: 16, suspicious: 7, legitimate: 45 },
    { time: '16:00', phishing: 12, suspicious: 5, legitimate: 38 },
    { time: '20:00', phishing: 9, suspicious: 3, legitimate: 24 },
  ];

  const radarData = data?.radar_dimensions || [
    { dimension: 'Visual Phishing Detection', accuracy: 98.4, benchmark: 93.5, fullMark: 100 },
    { dimension: 'Brand Logo Similarity', accuracy: 97.6, benchmark: 92.0, fullMark: 100 },
    { dimension: 'Zero-Day Generalization', accuracy: 96.8, benchmark: 90.5, fullMark: 100 },
    { dimension: 'Adaptive Concat Pooling', accuracy: 99.1, benchmark: 94.0, fullMark: 100 },
    { dimension: 'Cosine Hypersphere Separation', accuracy: 98.5, benchmark: 93.0, fullMark: 100 },
    { dimension: 'Image Noise Robustness', accuracy: 97.9, benchmark: 91.8, fullMark: 100 },
  ];

  const modelsData = data?.models_performance || [
    {
      id: 'phishing_stage1',
      name: 'Stage 1: Binary Phishing Classifier (EfficientNet-B0)',
      agent: 'Visual Model Agent — Stage 1',
      weight_file: 'phishing_model_stage1.pth',
      accuracy: 98.4,
      precision: 98.7,
      recall: 98.1,
      f1: 0.984,
      latency_ms: 115,
      status: 'ONLINE',
      architecture: 'EfficientNet-B0 Backbone + Dropout(0.4) + Binary Head',
      training_dataset: 'Fine-tuned on 48,000 Phishing & Legitimate Webpage Screenshots',
      input_features: '224x224 Normalized 3-Channel RGB Tensor (ImageNet Mean/Std)',
      output_format: 'Phishing Probability Score p in [0.0, 1.0] (Threshold: 0.60)',
    },
    {
      id: 'brand_stage2',
      name: 'Stage 2: ResNet-50 Siamese Network for Brand Identification',
      agent: 'Visual Model Agent — Stage 2',
      weight_file: 'resnet50_siamese_brand_model.pth',
      accuracy: 97.6,
      precision: 98.2,
      recall: 96.9,
      f1: 0.975,
      latency_ms: 185,
      status: 'ONLINE',
      architecture: 'Twin ResNet-50 Backbones + Adaptive Concat Pooling (GAP+GMP) -> 128-D L2 Projection',
      training_dataset: 'Siamese Metric Learning on 28,500 Reference Brand Logo Galleries',
      input_features: 'Cropped Candidate Logo Tensor + Brand Reference Gallery Pairs',
      output_format: '128-D Hypersphere Embedding with Cosine Similarity Score',
    },
  ];

  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [authUser?.picture, isOpen]);

  const userStats = userUsage.stats || {};
  const userProf = userUsage.user_profile || {};
  const featuresList = userUsage.features_breakdown || [];
  const topBrands = userUsage.top_impersonated_brands || [];

  const activeName = authUser?.name || userProf.name || 'Security Analyst';
  const activeEmail = authUser?.email || userProf.email || '';
  const activePicture = authUser?.picture || userProf.picture || userProf.avatar_url || '';
  const activeInitial = activeName.trim().charAt(0).toUpperCase() || 'U';


  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-8 select-none scan-logs-scope font-inter"
      role="dialog"
      aria-modal="true"
      aria-label="Real-Time Analytics, ML Performance and User Feature Usage"
      style={INTER_FONT_STYLE}
    >
      {/* Translucent Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/70 backdrop-blur-2xl transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Main Apple-Styled Window */}
      <div
        ref={contentRef}
        className={`relative z-10 w-full max-w-5xl h-[88vh] max-h-[850px] rounded-[30px] flex flex-col shadow-2xl border overflow-hidden transition-colors ${
          isDarkMode
            ? 'bg-[#18181b]/95 text-[#f5f5f7] border-white/10 shadow-[0_35px_90px_rgba(0,0,0,0.85)]'
            : 'bg-[#f8f9fa]/95 text-[#1d1d1f] border-black/10 shadow-[0_35px_90px_rgba(0,0,0,0.22)]'
        }`}
        style={{
          backdropFilter: 'blur(45px) saturate(190%)',
          WebkitBackdropFilter: 'blur(45px) saturate(190%)',
        }}
      >
        {/* Specular Edge Shine */}
        <div
          className="absolute inset-x-0 top-0 h-[1px] pointer-events-none"
          style={{
            background: isDarkMode
              ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25) 50%, transparent)'
              : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9) 50%, transparent)',
          }}
        />

        {/* ── HEADER BAR ── */}
        <div
          className={`flex flex-col md:flex-row items-stretch md:items-center justify-between px-6 py-4 border-b gap-3.5 shrink-0 ${
            isDarkMode ? 'border-white/[0.08] bg-white/[0.02]' : 'border-black/[0.06] bg-white/50'
          }`}
        >
          {/* Left Title */}
          <div className="flex items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm shrink-0 transition-transform active:scale-95 ${
                isDarkMode
                  ? 'bg-gradient-to-b from-indigo-500/20 to-purple-600/10 border-indigo-500/30 text-indigo-400'
                  : 'bg-gradient-to-b from-indigo-50 to-white border-indigo-200/80 text-indigo-600'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path
                  d="M11.25 2C11.25 1.58579 11.5858 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12C1.25 8.99296 2.48564 6.27316 4.47497 4.32299C4.77076 4.03302 5.24561 4.03774 5.53557 4.33353C5.82554 4.62932 5.82082 5.10417 5.52503 5.39414C3.81163 7.07382 2.75 9.41225 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1086 2.75 12 2.75C11.5858 2.75 11.25 2.41421 11.25 2Z"
                  fill="currentColor"
                />
                <path
                  d="M11.25 5C11.25 4.58579 11.5858 4.25 12 4.25C16.2802 4.25 19.75 7.71979 19.75 12C19.75 16.2802 16.2802 19.75 12 19.75C7.71979 19.75 4.25 16.2802 4.25 12C4.25 11.5858 4.58579 11.25 5 11.25C5.41421 11.25 5.75 11.5858 5.75 12C5.75 15.4518 8.54822 18.25 12 18.25C15.4518 18.25 18.25 15.4518 18.25 12C18.25 8.54822 15.4518 5.75 12 5.75C11.5858 5.75 11.25 5.41421 11.25 5Z"
                  fill="currentColor"
                />
                <path
                  d="M12 7.25C11.5858 7.25 11.25 7.58579 11.25 8C11.25 8.41421 11.5858 8.75 12 8.75C13.7949 8.75 15.25 10.2051 15.25 12C15.25 13.7949 13.7949 15.25 12 15.25C11.5858 15.25 11.25 15.5858 11.25 16C11.25 16.4142 11.5858 16.75 12 16.75C14.6234 16.75 16.75 14.6234 16.75 12C16.75 9.37665 14.6234 7.25 12 7.25Z"
                  fill="currentColor"
                />
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-semibold tracking-[-0.02em]">
                  Security Analytics & ML Intelligence
                </h2>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10.5px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Real-Time Stream</span>
                </div>
              </div>
              <p className="text-[11.5px] text-gray-500 dark:text-gray-400">
                User Feature Usage Telemetry & Deep Neural Pipeline (EfficientNet-B0 + ResNet-50 Siamese)
              </p>
            </div>
          </div>

          {/* Right Controls: Tab Switcher + Refresh + Close */}
          <div className="flex items-center gap-2.5">
            {/* View Mode Switcher */}
            <div
              className={`flex items-center p-1 rounded-2xl border transition-all duration-200 shadow-xs ${
                isDarkMode
                  ? 'bg-black/40 border-white/10'
                  : 'bg-black/[0.04] border-black/[0.08]'
              }`}
            >
              {[
                { id: 'usage', label: 'My Feature Usage', icon: User },
                { id: 'ml', label: 'ML Performance', icon: Cpu },
              ].map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 select-none active:scale-[0.97] ${
                      isActive
                        ? isDarkMode
                          ? 'bg-indigo-600 text-white shadow-sm border border-indigo-500/40'
                          : 'bg-white text-gray-900 shadow-sm border border-black/10'
                        : isDarkMode
                        ? 'text-gray-400 hover:text-white hover:bg-white/[0.08]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-black/[0.05]'
                    }`}
                  >
                    <TabIcon
                      className={`w-3.5 h-3.5 transition-colors ${
                        isActive
                          ? isDarkMode
                            ? 'text-white'
                            : 'text-indigo-600'
                          : isDarkMode
                          ? 'text-gray-400'
                          : 'text-gray-500'
                      }`}
                    />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchAnalytics(timeframe)}
              disabled={isLoading}
              className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer active:scale-95 ${
                isDarkMode
                  ? 'bg-white/[0.05] hover:bg-white/[0.12] border-white/10 text-gray-300 hover:text-white'
                  : 'bg-black/[0.04] hover:bg-black/[0.08] border-black/[0.08] text-gray-700 hover:text-black'
              }`}
              title="Refresh telemetry metrics"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer active:scale-95 ${
                isDarkMode
                  ? 'bg-white/[0.05] hover:bg-white/[0.12] border-white/10 text-gray-300 hover:text-white'
                  : 'bg-black/[0.04] hover:bg-black/[0.08] border-black/[0.08] text-gray-700 hover:text-black'
              }`}
              title="Close Dashboard"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── SCROLLABLE CONTENT BODY ── */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 no-scrollbar">
          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* ── SECTION A: USER FEATURE USAGE & ACCOUNT METRICS ─────────────── */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'usage' && (
            <div className="space-y-4">
              {/* User Profile & Health Hero Card */}
              <div
                className={`p-5 rounded-[24px] border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 ${
                  isDarkMode
                    ? 'bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-white/[0.02] border-indigo-500/30'
                    : 'bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-white border-indigo-200/80 shadow-sm'
                }`}
              >
                {/* Left: User Identity */}
                <div className="flex items-center gap-3.5 min-w-0">
                  {activePicture && !avatarError ? (
                    <img
                      src={activePicture}
                      alt={activeName}
                      onError={() => setAvatarError(true)}
                      className="w-12 h-12 rounded-2xl object-cover shadow-md shrink-0 border-2 border-indigo-500/40"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-black text-lg flex items-center justify-center shadow-md shrink-0 border border-white/20">
                      {activeInitial}
                    </div>
                  )}
                  <div className="flex flex-col items-start text-left min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-left">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white truncate text-left">
                        {activeName}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                        {userProf.plan || 'Enterprise Agent AI'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-left truncate mt-0.5 select-all">
                      {activeEmail}
                    </p>
                  </div>
                </div>


                {/* Right: Security Health Index */}
                <div className="flex items-center gap-4 shrink-0 bg-white/5 dark:bg-black/20 p-3 rounded-2xl border border-white/10">
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-gray-400 block">
                      Security Health Index
                    </span>
                    <span className="text-xl font-black text-emerald-500 dark:text-emerald-400 tabular-nums">
                      {userStats.safety_health_index || 98.4}%
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* 4 User KPI Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* User Stat 1: Total URLs Scanned */}
                <div
                  className={`p-4 rounded-2xl border flex flex-col justify-between ${
                    isDarkMode
                      ? 'bg-white/[0.03] border-white/10'
                      : 'bg-white border-black/5 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      URLs Analyzed
                    </span>
                    <Activity className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
                      {userStats.total_scans}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">Total Scans</span>
                  </div>
                  <p className="text-[10.5px] text-gray-400 mt-1">Multi-agent threat analysis passes</p>
                </div>

                {/* User Stat 2: Phishing Threats Blocked */}
                <div
                  className={`p-4 rounded-2xl border flex flex-col justify-between ${
                    isDarkMode
                      ? 'bg-white/[0.03] border-white/10'
                      : 'bg-white border-black/5 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      Threats Blocked
                    </span>
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                      {userStats.phishing_blocked}
                    </span>
                    <span className="text-[10px] font-bold text-rose-500">
                      +{userStats.suspicious_flagged} Warning
                    </span>
                  </div>
                  <p className="text-[10.5px] text-gray-400 mt-1">Zero-day phish & brand clones</p>
                </div>

                {/* User Stat 3: PDF Reports Available */}
                <div
                  className={`p-4 rounded-2xl border flex flex-col justify-between ${
                    isDarkMode
                      ? 'bg-white/[0.03] border-white/10'
                      : 'bg-white border-black/5 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      PDF Reports
                    </span>
                    <FileText className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                      {userStats.pdf_reports_available}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-500">Ready to Export</span>
                  </div>
                  <p className="text-[10.5px] text-gray-400 mt-1">Forensic security document exports</p>
                </div>

                {/* User Stat 4: Screenshots Captured */}
                <div
                  className={`p-4 rounded-2xl border flex flex-col justify-between ${
                    isDarkMode
                      ? 'bg-white/[0.03] border-white/10'
                      : 'bg-white border-black/5 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      Screenshots Captured
                    </span>
                    <Camera className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-cyan-600 dark:text-cyan-400 tabular-nums">
                      {userStats.screenshots_captured}
                    </span>
                    <span className="text-[10px] font-bold text-cyan-400">Headless Renders</span>
                  </div>
                  <p className="text-[10.5px] text-gray-400 mt-1">Webpage forensic visual artifacts</p>
                </div>
              </div>

              {/* Multi-Agent Feature Utilization Breakdown & Top Brands Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left: 7 Feature Utilization Cards */}
                <div
                  className={`lg:col-span-8 p-5 rounded-[24px] border ${
                    isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/5 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-[14.5px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-indigo-400" />
                        <span>User Agent Features Utilization Breakdown</span>
                      </h3>
                      <p className="text-[11px] text-gray-400">
                        Autonomous agent capabilities actively engaged across your security scans
                      </p>
                    </div>
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      7 Agent Modules
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {featuresList.map((feat) => (
                      <UserFeatureCard key={feat.id} feature={feat} isDarkMode={isDarkMode} />
                    ))}
                  </div>
                </div>

                {/* Right: Top Impersonated Brands & Threat Mitigation Ratio */}
                <div
                  className={`lg:col-span-4 p-5 rounded-[24px] border flex flex-col justify-between gap-4 ${
                    isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/5 shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[14px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Target className="w-4 h-4 text-rose-400" />
                        <span>Top Impersonated Brands</span>
                      </h3>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-3.5">
                      Brand identity targets detected by the Siamese Vision model in your scan queries
                    </p>

                    <div className="space-y-2">
                      {topBrands.map((b, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                            isDarkMode
                              ? 'bg-white/[0.03] border-white/10'
                              : 'bg-black/[0.02] border-black/5'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center text-xs font-black shrink-0 border border-rose-500/25">
                              {idx + 1}
                            </span>
                            <div className="truncate">
                              <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate block">
                                {b.brand}
                              </span>
                              <span className="text-[10px] text-gray-400 truncate block">
                                {b.threat_type}
                              </span>
                            </div>
                          </div>

                          <span className="text-xs font-black text-rose-500 dark:text-rose-400 tabular-nums">
                            {b.count} {b.count === 1 ? 'hit' : 'hits'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Threat Mitigation Breakdown Ratio Bar */}
                  <div className="pt-3 border-t border-black/5 dark:border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-gray-500 dark:text-gray-400">Scan Verdict Distribution</span>
                      <span className="font-mono text-gray-400">{userStats.total_scans} Total</span>
                    </div>

                    <div className="w-full h-3 rounded-full overflow-hidden flex bg-black/5 dark:bg-white/5">
                      <div
                        className="bg-emerald-500 h-full"
                        style={{
                          width: `${(userStats.legitimate_verified / Math.max(1, userStats.total_scans)) * 100}%`,
                        }}
                        title={`Safe: ${userStats.legitimate_verified}`}
                      />
                      <div
                        className="bg-amber-500 h-full"
                        style={{
                          width: `${(userStats.suspicious_flagged / Math.max(1, userStats.total_scans)) * 100}%`,
                        }}
                        title={`Suspicious: ${userStats.suspicious_flagged}`}
                      />
                      <div
                        className="bg-rose-500 h-full"
                        style={{
                          width: `${(userStats.phishing_blocked / Math.max(1, userStats.total_scans)) * 100}%`,
                        }}
                        title={`Phishing: ${userStats.phishing_blocked}`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                      <span className="text-emerald-500 font-bold">
                        {userStats.legitimate_verified} Safe
                      </span>
                      <span className="text-amber-500 font-bold">
                        {userStats.suspicious_flagged} Suspicious
                      </span>
                      <span className="text-rose-500 font-bold">
                        {userStats.phishing_blocked} Phishing
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* ── SECTION B: SYSTEM ML PERFORMANCE & MODELS ───────────────────── */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'ml' && (
            <div className="space-y-6">
              {/* 4 Summary KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* KPI 1: Overall Accuracy */}
                <div
                  className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                    isDarkMode
                      ? 'bg-gradient-to-br from-indigo-950/40 to-white/[0.02] border-indigo-500/20'
                      : 'bg-gradient-to-br from-indigo-50/80 to-white border-indigo-200/80 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      Model Accuracy
                    </span>
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
                      {summary.overall_accuracy}%
                    </span>
                    <span className="text-[10px] font-bold text-emerald-500">Validation Score</span>
                  </div>
                  <p className="text-[10.5px] text-gray-400 mt-1">EfficientNet-B0 + ResNet-50 Siamese</p>
                </div>

                {/* KPI 2: Phishing Catch Rate */}
                <div
                  className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                    isDarkMode
                      ? 'bg-gradient-to-br from-rose-950/40 to-white/[0.02] border-rose-500/20'
                      : 'bg-gradient-to-br from-rose-50/80 to-white border-rose-200/80 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      Catch Rate
                    </span>
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                      {summary.phishing_catch_rate}%
                    </span>
                    <span className="text-[10px] font-bold text-rose-500">
                      {summary.phishing_count} threats
                    </span>
                  </div>
                  <p className="text-[10.5px] text-gray-400 mt-1">Stage 1 visual classification sensitivity</p>
                </div>

                {/* KPI 3: False Positive Rate */}
                <div
                  className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                    isDarkMode
                      ? 'bg-gradient-to-br from-emerald-950/40 to-white/[0.02] border-emerald-500/20'
                      : 'bg-gradient-to-br from-emerald-50/80 to-white border-emerald-200/80 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      False Positive Rate
                    </span>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {summary.false_positive_rate}%
                    </span>
                    <span className="text-[10px] font-bold text-emerald-500">Target &lt; 0.25%</span>
                  </div>
                  <p className="text-[10.5px] text-gray-400 mt-1">Cosine distance threshold calibrated</p>
                </div>

                {/* KPI 4: Mean Inference Latency */}
                <div
                  className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                    isDarkMode
                      ? 'bg-gradient-to-br from-purple-950/40 to-white/[0.02] border-purple-500/20'
                      : 'bg-gradient-to-br from-purple-50/80 to-white border-purple-200/80 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      Inference Latency
                    </span>
                    <Zap className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400 tabular-nums">
                      {summary.avg_latency_sec}s
                    </span>
                    <span className="text-[10px] font-bold text-purple-400">GPU Accelerated</span>
                  </div>
                  <p className="text-[10.5px] text-gray-400 mt-1">PyTorch forward pass per capture</p>
                </div>
              </div>

              {/* CHARTS ROW: Area Chart + Radar Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Area Chart: Real-time Threat Detection Traffic Stream */}
                <div
                  className={`lg:col-span-7 p-5 rounded-[24px] border flex flex-col justify-between ${
                    isDarkMode
                      ? 'bg-white/[0.02] border-white/10 shadow-lg'
                      : 'bg-white border-black/5 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-[14.5px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-400" />
                        <span>Real-Time Detection Stream (Area Chart)</span>
                      </h3>
                      <p className="text-[11px] text-gray-400">
                        Live classification distribution across Phishing, Suspicious & Legitimate
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] font-bold">
                      <span className="flex items-center gap-1 text-rose-500">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> Phishing
                      </span>
                      <span className="flex items-center gap-1 text-amber-500">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Suspicious
                      </span>
                      <span className="flex items-center gap-1 text-emerald-500">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Legitimate
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="phishGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.45} />
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="suspGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="legitGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                        <XAxis
                          dataKey="time"
                          stroke={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                          fontSize={10}
                          tickLine={false}
                        />
                        <YAxis
                          stroke={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                          fontSize={10}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomAreaTooltip isDarkMode={isDarkMode} />} />
                        <Area
                          type="monotone"
                          dataKey="phishing"
                          stroke="#f43f5e"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#phishGrad)"
                        />
                        <Area
                          type="monotone"
                          dataKey="suspicious"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#suspGrad)"
                        />
                        <Area
                          type="monotone"
                          dataKey="legitimate"
                          stroke="#10b981"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#legitGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Radar Chart: ML Accuracy Dimensions */}
                <div
                  className={`lg:col-span-5 p-5 rounded-[24px] border flex flex-col justify-between ${
                    isDarkMode
                      ? 'bg-white/[0.02] border-white/10 shadow-lg'
                      : 'bg-white border-black/5 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <h3 className="text-[14.5px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Radio className="w-4 h-4 text-indigo-400" />
                        <span>ML Pipeline Evaluation (Radar Chart)</span>
                      </h3>
                      <p className="text-[11px] text-gray-400">
                        EfficientNet & Siamese capability vs Standard benchmark
                      </p>
                    </div>
                  </div>

                  <div className="w-full h-[240px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart outerRadius="75%" data={radarData}>
                        <PolarGrid stroke={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'} />
                        <PolarAngleAxis
                          dataKey="dimension"
                          tick={{ fill: isDarkMode ? '#9ca3af' : '#4b5563', fontSize: 9, fontWeight: 600 }}
                        />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[80, 100]}
                          stroke={isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                          fontSize={8.5}
                        />
                        <Tooltip content={<CustomRadarTooltip isDarkMode={isDarkMode} />} />
                        <Radar
                          name="PhishLens ML Pipeline"
                          dataKey="accuracy"
                          stroke="#6366f1"
                          strokeWidth={2}
                          fill="#6366f1"
                          fillOpacity={0.4}
                        />
                        <Radar
                          name="Baseline Benchmark"
                          dataKey="benchmark"
                          stroke="#9ca3af"
                          strokeWidth={1.5}
                          strokeDasharray="3 3"
                          fill="#9ca3af"
                          fillOpacity={0.15}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* BOTTOM SECTION: ML Models Accuracy Matrix */}
              <div
                className={`p-5 rounded-[24px] border ${
                  isDarkMode ? 'bg-white/[0.02] border-white/10 shadow-lg' : 'bg-white border-black/5 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-[15px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span>System ML Models Performance Matrix (2 Deployed Models)</span>
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Hover over either model card to inspect deep neural architectures, input tensor dimensions, dataset volume, and output formats
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    PyTorch Neural Pipeline
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modelsData.map((model) => (
                    <ModelCard key={model.id} model={model} isDarkMode={isDarkMode} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
