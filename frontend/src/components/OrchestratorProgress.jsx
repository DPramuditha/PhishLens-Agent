import { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  Code, 
  Camera, 
  Cpu, 
  Search,
  Brain, 
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import gsap from 'gsap';
import { DotmSquare12 } from './ui/dotm-square-12';
import FlickerSpinner from './ui/FlickerSpinner';

const AGENT_STEPS = [
  {
    id: 'url',
    name: 'URL Feature Agent',
    icon: Globe,
    description: 'Analyzing domain lexical structure, protocol, subdomains, and WHOIS records.',
    activeMsg: 'Analyzing URL reputation & syntax...',
    doneMsg: 'URL lexical features analyzed.'
  },
  {
    id: 'dom',
    name: 'HTML DOM Agent',
    icon: Code,
    description: 'Extracting input fields, form submission targets, external script sources, and security headers.',
    activeMsg: 'Parsing DOM structure and script assets...',
    doneMsg: 'HTML DOM features extracted.'
  },
  {
    id: 'screenshot',
    name: 'Screenshot Agent',
    icon: Camera,
    description: 'Rendering the URL in a headless browser viewport to capture high-fidelity visual layout.',
    activeMsg: 'Capturing viewport screenshot...',
    doneMsg: 'Viewport screenshot captured.'
  },
  {
    id: 'visual',
    name: 'Visual ML Agent',
    icon: Cpu,
    description: 'Evaluating logo placements, color palettes, and visual similarity comparison against trusted brands.',
    activeMsg: 'Comparing layout against brand datasets...',
    doneMsg: 'Visual brand similarity analyzed.'
  },
  {
    id: 'web_search',
    name: 'Web Search Agent',
    icon: Search,
    description: 'Performing live Tavily OSINT research for phishing reports, scam advisories, and brand verification.',
    activeMsg: 'Querying Tavily for live threat intelligence...',
    doneMsg: 'Web threat intelligence gathered.'
  },
  {
    id: 'orchestrator',
    name: 'ReAct Orchestrator',
    icon: Brain,
    description: 'Synthesizing all agent results using reasoning loops to generate final risk score and safety advice.',
    activeMsg: 'Reasoning and synthesizing findings...',
    doneMsg: 'Final synthesis complete.'
  }
];

function TypewriterText({ text, speed = 20 }) {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    setDisplayedText('');
    let index = 0;
    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + text.charAt(index));
      index++;
      if (index >= text.length) {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  // Cursor blinking effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <span>
      {displayedText}
      <span className={`inline-block w-1 h-3 bg-indigo-500/80 ml-0.5 align-middle ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
    </span>
  );
}

export default function OrchestratorProgress({ targetUrl, status = 'loading', duration }) {
  const [currentStep, setCurrentStep] = useState(status === 'completed' ? AGENT_STEPS.length : 0);
  const [seconds, setSeconds] = useState(status === 'completed' && duration !== undefined ? Math.round(duration) : 0);
  const [isExpanded, setIsExpanded] = useState(status === 'loading');
  
  // Custom one-by-one reasoning transitions
  const [displayedStep, setDisplayedStep] = useState(status === 'completed' ? AGENT_STEPS.length - 1 : 0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const detailsRef = useRef(null);
  const chevronRef = useRef(null);
  const isFirstRender = useRef(true);

  // GSAP timer
  useEffect(() => {
    if (status !== 'loading') {
      if (duration !== undefined) {
        setSeconds(Math.round(duration));
      }
      return;
    }

    const timerObj = { value: seconds };
    const tween = gsap.to(timerObj, {
      value: 180, // Max 3 minutes
      duration: 180,
      ease: 'none',
      onUpdate: () => {
        setSeconds(Math.floor(timerObj.value));
      }
    });

    return () => tween.kill();
  }, [status, duration]);

  // Agent progression simulation
  useEffect(() => {
    if (status !== 'loading') {
      setCurrentStep(AGENT_STEPS.length);
      return;
    }

    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < AGENT_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2800);

    return () => clearInterval(timer);
  }, [status]);

  // Handle step active change transition
  useEffect(() => {
    if (status === 'completed') {
      setDisplayedStep(AGENT_STEPS.length - 1);
      setIsFadingOut(false);
      return;
    }

    const activeIndex = currentStep < AGENT_STEPS.length ? currentStep : AGENT_STEPS.length - 1;
    if (activeIndex !== displayedStep) {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setDisplayedStep(activeIndex);
        setIsFadingOut(false);
      }, 300); // 300ms fade out
      return () => clearTimeout(timer);
    }
  }, [currentStep, status]);

  // Auto-expand on loading, auto-collapse on completed
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const el = detailsRef.current;
    const chevron = chevronRef.current;
    if (!el || !chevron) return;

    if (status === 'loading') {
      setIsExpanded(true);
      gsap.killTweensOf(el);
      gsap.killTweensOf(chevron);
      
      // Expand smoothly
      gsap.set(el, { height: 'auto', display: 'block' });
      const targetHeight = el.offsetHeight;
      gsap.set(el, { height: 0, opacity: 0 });

      gsap.to(el, {
        height: targetHeight,
        opacity: 1,
        duration: 0.5,
        ease: 'power2.out',
        onComplete: () => {
          gsap.set(el, { height: 'auto' });
        }
      });
      gsap.to(chevron, { rotate: 180, duration: 0.3 });
    } else if (status === 'completed') {
      setIsExpanded(false);
      gsap.killTweensOf(el);
      gsap.killTweensOf(chevron);

      // Collapse smoothly
      gsap.to(el, {
        height: 0,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.inOut',
        onComplete: () => {
          gsap.set(el, { display: 'none' });
        }
      });
      gsap.to(chevron, { rotate: 0, duration: 0.3 });
    }
  }, [status]);

  // GSAP Expand/Collapse manual animation
  const handleToggle = () => {
    const wasExpanded = isExpanded;
    setIsExpanded(!wasExpanded);

    const el = detailsRef.current;
    const chevron = chevronRef.current;

    if (!wasExpanded) {
      // Expand
      gsap.killTweensOf(el);
      gsap.killTweensOf(chevron);

      // Measure height
      gsap.set(el, { height: 'auto', display: 'block' });
      const targetHeight = el.offsetHeight;
      gsap.set(el, { height: 0, opacity: 0 });

      gsap.to(el, {
        height: targetHeight,
        opacity: 1,
        duration: 0.5,
        ease: 'power2.out',
        onComplete: () => {
          gsap.set(el, { height: 'auto' });
        }
      });
      gsap.to(chevron, { rotate: 180, duration: 0.3 });
    } else {
      // Collapse
      gsap.killTweensOf(el);
      gsap.killTweensOf(chevron);

      gsap.to(el, {
        height: 0,
        opacity: 0,
        duration: 0.4,
        ease: 'power2.inOut',
        onComplete: () => {
          gsap.set(el, { display: 'none' });
        }
      });
      gsap.to(chevron, { rotate: 0, duration: 0.3 });
    }
  };

  const step = AGENT_STEPS[displayedStep];
  const stepText = step ? `${step.name}: ${status === 'completed' || displayedStep < currentStep ? step.doneMsg : step.activeMsg}` : '';

  return (
    <div className="flex flex-col gap-1 max-w-2xl w-full">
      {/* Sleek compact pill trigger (Completely Transparent) */}
      <div 
        onClick={handleToggle}
        className="flex items-center gap-2.5 py-1.5 cursor-pointer select-none hover:opacity-85 transition-opacity w-fit bg-transparent"
      >
        <DotmSquare12 
          size={25} 
          dotSize={3.3} 
          color={status === 'loading' ? '#422ea8' : '#10b981'} 
          speed={1.5}
          animated={status === 'loading'}
          dotShape="square"
        />
        <span className="text-[13px] font-medium text-gray-700 dark:text-zinc-300">
          {status === 'loading' ? 'Thinking about your request' : 'Thinking process complete'}
        </span>
        <span className="text-[13px] text-gray-400 dark:text-zinc-500 shrink-0">
          • {seconds}s
        </span>
        <div 
          ref={chevronRef} 
          className="flex items-center justify-center text-gray-400 dark:text-zinc-500 ml-0.5"
          style={status === 'loading' ? { transform: 'rotate(180deg)' } : undefined}
        >
          <ChevronDown size={14} />
        </div>
      </div>

      {/* Expandable detailed multi-agent grid (Completely Transparent) */}
      <div 
        ref={detailsRef}
        className="overflow-hidden"
        style={status === 'loading' ? { height: 'auto', opacity: 1, display: 'block' } : { display: 'none', height: 0, opacity: 0 }}
      >
        <div className="flex flex-col gap-3 mt-2 pl-4 border-l-2 border-indigo-500/30 dark:border-indigo-500/20 bg-transparent py-1">
          <div className={`transition-opacity duration-300 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
            {stepText && (
              <div className="flex items-center gap-2 text-xs font-mono text-gray-600 dark:text-zinc-400 leading-relaxed">
                {status === 'loading' && displayedStep === currentStep && (
                  <FlickerSpinner size={16} />
                )}
                <TypewriterText text={stepText} key={displayedStep} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
