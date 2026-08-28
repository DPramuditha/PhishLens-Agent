import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Check } from 'lucide-react';

import multiAgentsImg from '../assets/features/multi agents results.png';
import pdfDownloadImg from '../assets/features/PDF download.png';
import screenshotDisplayImg from '../assets/features/Screenshort Display.png';
import visualMlImg from '../assets/features/Visual ML classifier.png';

gsap.registerPlugin(ScrollTrigger);

/* ── Custom Feature SVG Icons ── */
function MultiAgentsIcon({ className = 'w-5 h-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className}>
      <path fillRule="evenodd" clipRule="evenodd" d="M12 1.25C9.37665 1.25 7.25 3.37665 7.25 6C7.25 8.62335 9.37665 10.75 12 10.75C14.6234 10.75 16.75 8.62335 16.75 6C16.75 3.37665 14.6234 1.25 12 1.25ZM8.75 6C8.75 4.20507 10.2051 2.75 12 2.75C13.7949 2.75 15.25 4.20507 15.25 6C15.25 7.79493 13.7949 9.25 12 9.25C10.2051 9.25 8.75 7.79493 8.75 6Z" fill="currentColor" />
      <path d="M18 3.25C17.5858 3.25 17.25 3.58579 17.25 4C17.25 4.41421 17.5858 4.75 18 4.75C19.3765 4.75 20.25 5.65573 20.25 6.5C20.25 7.34427 19.3765 8.25 18 8.25C17.5858 8.25 17.25 8.58579 17.25 9C17.25 9.41421 17.5858 9.75 18 9.75C19.9372 9.75 21.75 8.41715 21.75 6.5C21.75 4.58285 19.9372 3.25 18 3.25Z" fill="currentColor" />
      <path d="M6.75 4C6.75 3.58579 6.41421 3.25 6 3.25C4.06278 3.25 2.25 4.58285 2.25 6.5C2.25 8.41715 4.06278 9.75 6 9.75C6.41421 9.75 6.75 9.41421 6.75 9C6.75 8.58579 6.41421 8.25 6 8.25C4.62351 8.25 3.75 7.34427 3.75 6.5C3.75 5.65573 4.62351 4.75 6 4.75C6.41421 4.75 6.75 4.41421 6.75 4Z" fill="currentColor" />
      <path fillRule="evenodd" clipRule="evenodd" d="M12 12.25C10.2157 12.25 8.56645 12.7308 7.34133 13.5475C6.12146 14.3608 5.25 15.5666 5.25 17C5.25 18.4334 6.12146 19.6392 7.34133 20.4525C8.56645 21.2692 10.2157 21.75 12 21.75C13.7843 21.75 15.4335 21.2692 16.6587 20.4525C17.8785 19.6392 18.75 18.4334 18.75 17C18.75 15.5666 17.8785 14.3608 16.6587 13.5475C15.4335 12.7308 13.7843 12.25 12 12.25ZM6.75 17C6.75 16.2242 7.22169 15.4301 8.17338 14.7956C9.11984 14.1646 10.4706 13.75 12 13.75C13.5294 13.75 14.8802 14.1646 15.8266 14.7956C16.7783 15.4301 17.25 16.2242 17.25 17C17.25 17.7758 16.7783 18.5699 15.8266 19.2044C14.8802 19.8354 13.5294 20.25 12 20.25C10.4706 20.25 9.11984 19.8354 8.17338 19.2044C7.22169 18.5699 6.75 17.7758 6.75 17Z" fill="currentColor" />
      <path d="M19.2674 13.8393C19.3561 13.4347 19.7561 13.1787 20.1607 13.2674C21.1225 13.4783 21.9893 13.8593 22.6328 14.3859C23.2758 14.912 23.75 15.6352 23.75 16.5C23.75 17.3648 23.2758 18.088 22.6328 18.6141C21.9893 19.1407 21.1225 19.5217 20.1607 19.7326C19.7561 19.8213 19.3561 19.5653 19.2674 19.1607C19.1787 18.7561 19.4347 18.3561 19.8393 18.2674C20.6317 18.0936 21.2649 17.7952 21.6829 17.4532C22.1014 17.1108 22.25 16.7763 22.25 16.5C22.25 16.2237 22.1014 15.8892 21.6829 15.5468C21.2649 15.2048 20.6317 14.9064 19.8393 14.7326C19.4347 14.6439 19.1787 14.2439 19.2674 13.8393Z" fill="currentColor" />
      <path d="M3.83935 13.2674C4.24395 13.1787 4.64387 13.4347 4.73259 13.8393C4.82132 14.2439 4.56525 14.6439 4.16065 14.7326C3.36829 14.9064 2.73505 15.2048 2.31712 15.5468C1.89863 15.8892 1.75 16.2237 1.75 16.5C1.75 16.7763 1.89863 17.1108 2.31712 17.4532C2.73505 17.7952 3.36829 18.0936 4.16065 18.2674C4.56525 18.3561 4.82132 18.7561 4.73259 19.1607C4.64387 19.5653 4.24395 19.8213 3.83935 19.7326C2.87746 19.5217 2.0107 19.1407 1.36719 18.6141C0.724248 18.088 0.25 17.3648 0.25 16.5C0.25 15.6352 0.724248 14.912 1.36719 14.3859C2.0107 13.8593 2.87746 13.4783 3.83935 13.2674Z" fill="currentColor" />
    </svg>
  );
}

function PdfDownloadIcon({ className = 'w-5 h-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12.5303 17.5303C12.3897 17.671 12.1989 17.75 12 17.75C11.8011 17.75 11.6103 17.671 11.4697 17.5303L8.96967 15.0303C8.67678 14.7374 8.67678 14.2626 8.96967 13.9697C9.26256 13.6768 9.73744 13.6768 10.0303 13.9697L11.25 15.1893V11C11.25 10.5858 11.5858 10.25 12 10.25C12.4142 10.25 12.75 10.5858 12.75 11V15.1893L13.9697 13.9697C14.2626 13.6768 14.7374 13.6768 15.0303 13.9697C15.3232 14.2626 15.3232 14.7374 15.0303 15.0303L12.5303 17.5303Z" fill="currentColor" />
      <path fillRule="evenodd" clipRule="evenodd" d="M12.0574 1.25H11.9426C9.63423 1.24999 7.82519 1.24998 6.41371 1.43975C4.96897 1.63399 3.82895 2.03933 2.93414 2.93414C2.03933 3.82895 1.63399 4.96897 1.43975 6.41371C1.24998 7.82519 1.24999 9.63422 1.25 11.9426V12H1.26092C1.25 12.5788 1.25 13.2299 1.25 13.9664V14.0336C1.25 15.4053 1.24999 16.4807 1.32061 17.3451C1.39252 18.2252 1.54138 18.9523 1.87671 19.6104C2.42799 20.6924 3.30762 21.572 4.38956 22.1233C5.04769 22.4586 5.7748 22.6075 6.65494 22.6794C7.51927 22.75 8.59469 22.75 9.96637 22.75H14.0336C15.4053 22.75 16.4807 22.75 17.3451 22.6794C18.2252 22.6075 18.9523 22.4586 19.6104 22.1233C20.6924 21.572 21.572 20.6924 22.1233 19.6104C22.4586 18.9523 22.6075 18.2252 22.6794 17.3451C22.75 16.4807 22.75 15.4053 22.75 14.0336V13.9664C22.75 13.2302 22.75 12.5787 22.7391 12H22.75V11.9426C22.75 9.63423 22.75 7.82519 22.5603 6.41371C22.366 4.96897 21.9607 3.82895 21.0659 2.93414C20.1711 2.03933 19.031 1.63399 17.5863 1.43975C16.1748 1.24998 14.3658 1.24999 12.0574 1.25ZM4.38956 5.87671C3.82626 6.16372 3.31781 6.53974 2.88197 6.98698C2.89537 6.85884 2.91012 6.73444 2.92637 6.61358C3.09825 5.33517 3.42514 4.56445 3.9948 3.9948C4.56445 4.56445 20.9018 5.33517 21.0736 6.61358C21.0899 6.73445 21.1046 6.85884 21.118 6.98698C20.6822 6.53975 20.1737 6.16372 19.6104 5.87671C18.9523 5.54138 18.2252 5.39252 17.3451 5.32061C16.4807 5.24999 15.4053 5.25 14.0336 5.25H9.96645C8.59472 5.25 7.51929 5.24999 6.65494 5.32061C5.7748 5.39252 5.04769 5.54138 4.38956 5.87671ZM5.07054 7.21322C5.48197 7.00359 5.9897 6.87996 6.77708 6.81563C7.57322 6.75058 8.58749 6.75 10 6.75H14C15.4125 6.75 16.4268 6.75058 17.2229 6.81563C18.0103 6.87996 18.518 7.00359 18.9295 7.21322C19.7291 7.62068 20.3793 8.27085 20.7868 9.07054C20.9964 9.48197 21.12 9.9897 21.1844 10.7771C21.2494 11.5732 21.25 12.5875 21.25 14C21.25 15.4125 21.2494 16.4268 21.1844 17.2229C21.12 18.0103 20.9964 18.518 20.7868 18.9295C20.3793 19.7291 19.7291 20.3793 18.9295 20.7868C18.518 20.9964 18.0103 21.12 17.2229 21.1844C16.4268 21.2494 15.4125 21.25 14 21.25H10C8.58749 21.25 7.57322 21.2494 6.77708 21.1844C5.9897 21.12 5.48197 20.9964 5.07054 20.7868C4.27085 20.3793 3.62068 19.7291 3.21322 18.9295C3.00359 18.518 2.87996 18.0103 2.81563 17.2229C2.75058 16.4268 2.75 15.4125 2.75 14C2.75 12.5875 2.75058 11.5732 2.81563 10.7771C2.87996 9.9897 3.00359 9.48197 3.21322 9.07054C3.62068 8.27085 4.27085 7.62069 5.07054 7.21322Z" fill="currentColor" />
    </svg>
  );
}

function ScreenshotIcon({ className = 'w-5 h-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className}>
      <path fillRule="evenodd" clipRule="evenodd" d="M8.69934 1.25001C8.71302 1.25001 8.72689 1.25001 8.74097 1.25001H15.2588C15.2728 1.25001 15.2867 1.25001 15.3004 1.25001C15.5202 1.24995 15.6888 1.2499 15.8362 1.26571C17.1903 1.41104 18.2268 2.52305 18.2897 3.87008C19.5324 4.24111 20.4024 5.4249 20.3416 6.75728C20.7401 6.93704 21.0929 7.18502 21.3948 7.5298C22.0112 8.23385 22.1994 9.09539 22.2067 10.1006C22.2136 11.0723 22.0497 12.3015 21.8454 13.8337L21.4309 16.9422C21.2712 18.1401 21.142 19.1096 20.941 19.8688C20.7319 20.659 20.423 21.3141 19.8436 21.8215C19.2641 22.3288 18.5739 22.5483 17.763 22.6512C16.9839 22.75 16.0058 22.75 14.7974 22.75H9.20247C7.99402 22.75 7.01592 22.75 6.23686 22.6512C5.42593 22.5483 4.73571 22.3288 4.15625 21.8215C3.57679 21.3141 3.26798 20.659 3.05881 19.8688C2.85786 19.1096 2.72861 18.1401 2.56891 16.9422L2.15444 13.8337C1.95013 12.3015 1.78621 11.0723 1.79318 10.1006C1.8004 9.09539 1.98862 8.23385 2.60503 7.5298C2.90689 7.18502 3.25976 6.93703 3.65819 6.75728C3.59746 5.42494 4.46737 4.24117 5.71004 3.87011C5.77292 2.52306 6.80941 1.41104 8.16358 1.26571C8.31093 1.2499 8.47949 1.24995 8.69934 1.25001ZM7.23209 3.75001H16.7676C16.6611 3.22633 16.2263 2.8162 15.6761 2.75715C15.6198 2.75111 15.5396 2.75001 15.2588 2.75001H8.74097C8.46012 2.75001 8.37992 2.75111 8.32363 2.75715C7.77343 2.8162 7.33861 3.22633 7.23209 3.75001ZM5.18083 6.36744C6.12317 6.24998 7.3196 6.24999 8.7941 6.25001H15.2057C16.6802 6.24999 17.8767 6.24998 18.819 6.36744C18.6969 5.74074 18.1452 5.25001 17.4618 5.25001H6.53801C5.85464 5.25001 5.30291 5.74074 5.18083 6.36744ZM5.25493 7.87068C4.43054 7.98663 4.01357 8.19811 3.7336 8.51788C3.45363 8.83766 3.29912 9.27892 3.29314 10.1114C3.28702 10.9652 3.43518 12.0897 3.64907 13.6939L3.70579 14.1192L4.1272 13.814C5.21468 13.0264 6.82145 13.0652 7.85563 13.9212L11.6938 17.0981C12.0566 17.3983 12.6816 17.4544 13.1327 17.192L13.3996 17.0368C14.6758 16.2944 16.3862 16.3727 17.5638 17.25L19.6413 18.7976C19.7437 18.2419 19.8355 17.5586 19.9508 16.6939L20.3508 13.6939C20.5647 12.0897 20.7128 10.9652 20.7067 10.1114C20.7007 9.27892 20.5462 8.83766 20.2662 8.51788C19.9863 8.19811 19.5693 7.98663 18.7449 7.87068C17.8994 7.75177 16.7652 7.75001 15.1468 7.75001H8.85302C7.23464 7.75001 6.10042 7.75177 5.25493 7.87068ZM19.1677 20.3153L16.6677 18.4529C15.985 17.9444 14.9252 17.8847 14.1538 18.3334L13.887 18.4886C12.9152 19.0539 11.6044 18.9712 10.7374 18.2536L6.89919 15.0767C6.4012 14.6645 5.55027 14.6355 5.00705 15.0289L3.93098 15.8082L4.04907 16.6939C4.21706 17.9538 4.33511 18.8285 4.50887 19.4849C4.67721 20.1209 4.87533 20.4574 5.14434 20.6929C5.41335 20.9284 5.77307 21.0803 6.42568 21.1631C7.09932 21.2486 7.98194 21.25 9.25302 21.25H14.7468C16.0179 21.25 16.9005 21.2486 17.5742 21.1631C18.2268 21.0803 18.5865 20.9284 18.8555 20.6929C18.9717 20.5912 19.0746 20.4706 19.1677 20.3153ZM16.4999 10.75C16.0857 10.75 15.7499 11.0858 15.7499 11.5C15.7499 11.9142 16.0857 12.25 16.4999 12.25C16.9141 12.25 17.2499 11.9142 17.2499 11.5C17.2499 11.0858 16.9141 10.75 16.4999 10.75ZM14.2499 11.5C14.2499 10.2574 15.2573 9.25001 16.4999 9.25001C17.7426 9.25001 18.7499 10.2574 18.7499 11.5C18.7499 12.7427 17.7426 13.75 16.4999 13.75C15.2573 13.75 14.2499 12.7427 14.2499 11.5Z" fill="currentColor" />
    </svg>
  );
}

function VisualMlIcon({ className = 'w-5 h-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className}>
      <path fillRule="evenodd" clipRule="evenodd" d="M9 1.25C9.41421 1.25 9.75 1.58579 9.75 2V3.26272C10.216 3.25376 10.7154 3.25111 11.25 3.25032V2C11.25 1.58579 11.5858 1.25 12 1.25C12.4142 1.25 12.75 1.58579 12.75 2V3.25032C13.2846 3.25111 13.784 3.25376 14.25 3.26272V2C14.25 1.58579 14.5858 1.25 15 1.25C15.4142 1.25 15.75 1.58579 15.75 2V3.32709C16.0099 3.34691 16.2561 3.37182 16.489 3.40313C17.6614 3.56076 18.6104 3.89288 19.3588 4.64124C20.1071 5.38961 20.4392 6.33855 20.5969 7.51098C20.6282 7.7439 20.6531 7.99006 20.6729 8.25H22C22.4142 8.25 22.75 8.58579 22.75 9C22.75 9.41421 22.4142 9.75 22 9.75H20.7373C20.7462 10.216 20.7489 10.7154 20.7497 11.25H22C22.4142 11.25 22.75 11.5858 22.75 12C22.75 12.4142 22.4142 12.75 22 12.75H20.7497C20.7489 13.2846 20.7462 13.784 20.7373 14.25H22C22.4142 14.25 22.75 14.5858 22.75 15C22.75 15.4142 22.4142 15.75 22 15.75H20.6729C20.6531 16.0099 20.6282 16.2561 20.5969 16.489C20.4392 17.6614 20.1071 18.6104 19.3588 19.3588C18.6104 20.1071 17.6614 20.4392 16.489 20.5969C16.2561 20.6282 16.0099 20.6531 15.75 20.6729V22C15.75 22.4142 15.4142 22.75 15 22.75C14.5858 22.75 14.25 22.4142 14.25 22V20.7373C13.784 20.7462 13.2846 20.7489 12.75 20.7497V22C12.75 22.4142 12.4142 22.75 12 22.75C11.5858 22.75 11.25 22.4142 11.25 22V20.7497C10.7154 20.7489 10.216 20.7462 9.75 20.7373V22C9.75 22.4142 9.41421 22.75 9 22.75C8.58579 22.75 8.25 22.4142 8.25 22V20.6729C7.99006 20.6531 7.7439 20.6282 7.51098 20.5969C6.33855 20.4392 5.38961 20.1071 4.64124 19.3588C3.89288 18.6104 3.56076 17.6614 3.40313 16.489C3.37182 16.2561 3.34691 16.0099 3.32709 15.75H2C1.58579 15.75 1.25 15.4142 1.25 15C1.25 14.5858 1.58579 14.25 2 14.25H3.26272C3.25376 13.784 3.25111 13.2846 3.25032 12.75H2C1.58579 12.75 1.25 12.4142 1.25 12C1.25 11.5858 1.58579 11.25 2 11.25H3.25032C3.25111 10.7154 3.25376 10.216 3.26272 9.75H2C1.58579 9.75 1.25 9.41421 1.25 9C1.25 8.58579 1.58579 8.25 2 8.25H3.32709C3.34691 7.99006 3.37182 7.7439 3.40313 7.51098C3.56076 6.33855 3.89288 5.38961 4.64124 4.64124C5.38961 3.89288 6.33855 3.56076 7.51098 3.40313C7.7439 3.37182 7.99006 3.34691 8.25 3.32709V2C8.25 1.58579 8.58579 1.25 9 1.25ZM7.71085 4.88976C6.70476 5.02502 6.12511 5.27869 5.7019 5.7019C5.27869 6.12511 5.02502 6.70476 4.88976 7.71085C4.75159 8.73851 4.75 10.0932 4.75 12C4.75 13.9068 4.75159 15.2615 4.88976 16.2892C5.02502 17.2952 5.27869 17.8749 5.7019 18.2981C6.12511 18.7213 6.70476 18.975 7.71085 19.1102C8.73851 19.2484 10.0932 19.25 12 19.25C13.9068 19.25 15.2615 19.2484 16.2892 19.1102C17.2952 18.975 17.8749 18.7213 18.2981 18.2981C18.7213 17.8749 18.975 17.2952 19.1102 16.2892C19.2484 15.2615 19.25 13.9068 19.25 12C19.25 10.0932 19.2484 8.73851 19.1102 7.71085C18.975 6.70476 18.7213 6.12511 18.2981 5.7019C17.8749 5.27869 17.2952 5.02502 16.2892 4.88976C15.2615 4.75159 13.9068 4.75 12 4.75C10.0932 4.75 8.73851 4.75159 7.71085 4.88976ZM9.95063 6.25H14.0494C14.7142 6.24996 15.2871 6.24993 15.7458 6.31161C16.2375 6.3777 16.7087 6.52676 17.091 6.90901C17.4732 7.29126 17.6223 7.76252 17.6884 8.25416C17.7501 8.7129 17.75 9.28576 17.75 9.95063V14.0494C17.75 14.7142 17.7501 15.2871 17.6884 15.7458C17.6223 16.2375 17.4732 16.7087 17.091 17.091C16.7087 17.4732 16.2375 17.6223 15.7458 17.6884C15.2871 17.7501 14.7142 17.75 14.0494 17.75H9.95063C9.28576 17.75 8.7129 17.7501 8.25416 17.6884C7.76252 17.6223 7.29126 17.4732 6.90901 17.091C6.52676 16.7087 6.3777 16.2375 6.31161 15.7458C6.24993 15.2871 6.24996 14.7142 6.25 14.0494V9.95063C6.24996 9.28576 6.24993 8.7129 6.31161 8.25416C6.3777 7.76252 6.52676 7.29126 6.90901 6.90901C7.29126 6.52676 7.76252 6.3777 8.25416 6.31161C8.7129 6.24993 9.28576 6.24996 9.95063 6.25ZM8.45403 7.79823C8.12872 7.84197 8.02676 7.91258 7.96967 7.96967C7.91258 8.02676 7.84197 8.12872 7.79823 8.45403C7.75159 8.80091 7.75 9.27169 7.75 10V14C7.75 14.7283 7.75159 15.1991 7.79823 15.546C7.84197 15.8713 7.91258 15.9732 7.96967 16.0303C8.02676 16.0874 8.12872 16.158 8.45403 16.2018C8.80091 16.2484 9.27169 16.25 10 16.25H14C14.7283 16.25 15.1991 16.2484 15.546 16.2018C15.8713 16.158 15.9732 16.0874 16.0303 16.0303C16.0874 15.9732 16.158 15.8713 16.2018 15.546C16.2484 15.1991 16.25 14.7283 16.25 14V10C16.25 9.27169 16.2484 8.80091 16.2018 8.45403C16.158 8.12872 16.0874 8.02676 16.0303 7.96967C15.9732 7.91258 15.8713 7.84197 15.546 7.79823C15.1991 7.75159 14.7283 7.75 14 7.75H10C9.27169 7.75 8.80091 7.75159 8.45403 7.79823ZM12.8645 9.3897C13.2016 9.63046 13.2796 10.0989 13.0389 10.4359L12.4574 11.25H13C13.2809 11.25 13.5383 11.407 13.6669 11.6568C13.7954 11.9066 13.7736 12.2073 13.6103 12.4359L12.1817 14.4359C11.941 14.773 11.4726 14.8511 11.1355 14.6103C10.7984 14.3695 10.7204 13.9011 10.9611 13.5641L11.5426 12.75H11C10.7191 12.75 10.4617 12.593 10.3331 12.3432C10.2046 12.0934 10.2264 11.7927 10.3897 11.5641L11.8183 9.56407C12.059 9.22701 12.5274 9.14894 12.8645 9.3897Z" fill="currentColor" />
    </svg>
  );
}

const FEATURES_DATA = [
  {
    id: 'multi-agents',
    step: '01',
    badge: 'PARALLEL CONSENSUS',
    title: 'Multi-agent',
    Icon: MultiAgentsIcon,
    description:
      'Multiple agents work in parallel for deeper answers on the hardest questions. Each agent shows its work so you can audit the reasoning.',
    bullets: [
      'Parallel agents tackle sub-problems simultaneously',
      "Each agent's reasoning is transparent and auditable",
      'Results merge into one coherent, cited answer',
    ],
    image: multiAgentsImg,
    alt: 'Multi-agent cybersecurity reasoning interface',
  },
  {
    id: 'pdf-download',
    step: '02',
    badge: 'INCIDENT DOCUMENTATION',
    title: 'PDF download',
    Icon: PdfDownloadIcon,
    description:
      'Generate audit-grade forensic PDF cybersecurity reports with complete evidence documentation, threat telemetry, and remediation steps.',
    bullets: [
      'Executive summary & technical deep-dive breakdown',
      'High-resolution visual snapshots & evidence custody',
      'Instant report export for security operations & compliance audits',
    ],
    image: pdfDownloadImg,
    alt: 'Forensic PDF investigation report preview',
  },
  {
    id: 'screenshot-capture',
    step: '03',
    badge: 'SANDBOX RENDERING',
    title: 'Screenshot Capture',
    Icon: ScreenshotIcon,
    description:
      'Automated headless browser rendering captures full-page snapshots, DOM structure, and login clones safely inside an isolated environment.',
    bullets: [
      'Real-time visual comparison against legitimate brand assets',
      'Pixel-perfect capture of dynamic overlays and redirected payloads',
      'Interactive modal gallery for inspecting captured visual artifacts',
    ],
    image: screenshotDisplayImg,
    alt: 'Headless sandbox screenshot analysis viewer',
  },
  {
    id: 'visual-ml',
    step: '04',
    badge: 'DEEP VISION ANALYSIS',
    title: 'Visual ML',
    Icon: VisualMlIcon,
    description:
      'Deep Siamese Convolutional Neural Networks and MobileNetV2 vision models identify deceptive brand spoofing, logo forgery, and homoglyphs.',
    bullets: [
      'Target brand visual similarity scoring & Siamese verification',
      'Identifies sophisticated homograph, typosquatting & zero-day lures',
      'Automated risk classification with confidence probability thresholds',
    ],
    image: visualMlImg,
    alt: 'Visual ML Siamese brand classifier dashboard',
  },
];

export default function FeaturesSection() {
  const sectionRef = useRef(null);
  const triggerRef = useRef(null);
  const textItemRefs = useRef([]);
  const imageLayerRefs = useRef([]);
  const indicatorFillRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let ctx;
    const rId = requestAnimationFrame(() => {
      ctx = gsap.context(() => {
        // Set initial element states cleanly through GSAP
        textItemRefs.current.forEach((el, idx) => {
          if (el) {
            gsap.set(el, {
              opacity: idx === 0 ? 1 : 0,
              y: idx === 0 ? 0 : 16,
              pointerEvents: idx === 0 ? 'auto' : 'none',
              visibility: 'visible',
            });
          }
        });

        imageLayerRefs.current.forEach((el, idx) => {
          if (el) {
            gsap.set(el, {
              opacity: idx === 0 ? 1 : 0,
              scale: idx === 0 ? 1 : 0.96,
              visibility: 'visible',
            });
          }
        });

        if (indicatorFillRef.current) {
          gsap.set(indicatorFillRef.current, { scaleY: 0.05, transformOrigin: 'top center' });
        }

        // Create master pinned timeline with smooth scrub
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: '+=2400',
            pin: true,
            pinSpacing: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const p = self.progress;
              let current = 0;
              if (p >= 0.75) current = 3;
              else if (p >= 0.50) current = 2;
              else if (p >= 0.25) current = 1;
              else current = 0;
              setActiveIndex(current);
            },
          },
        });

        triggerRef.current = tl.scrollTrigger;

        // Track fill progress across the entire timeline 0 -> 3.0
        if (indicatorFillRef.current) {
          tl.to(
            indicatorFillRef.current,
            { scaleY: 1, ease: 'none', duration: 3 },
            0
          );
        }

        // ── Transition 0 -> 1 (occurs at t = 0.65 to t = 0.95)
        tl.to(
          textItemRefs.current[0],
          { opacity: 0, y: -16, duration: 0.25, ease: 'power2.inOut', pointerEvents: 'none' },
          0.65
        )
          .to(
            imageLayerRefs.current[0],
            { opacity: 0, scale: 0.96, duration: 0.25, ease: 'power2.inOut' },
            0.65
          )
          .to(
            textItemRefs.current[1],
            { opacity: 1, y: 0, duration: 0.25, ease: 'power2.inOut', pointerEvents: 'auto' },
            0.75
          )
          .to(
            imageLayerRefs.current[1],
            { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.inOut' },
            0.75
          );

        // ── Transition 1 -> 2 (occurs at t = 1.40 to t = 1.70)
        tl.to(
          textItemRefs.current[1],
          { opacity: 0, y: -16, duration: 0.25, ease: 'power2.inOut', pointerEvents: 'none' },
          1.40
        )
          .to(
            imageLayerRefs.current[1],
            { opacity: 0, scale: 0.96, duration: 0.25, ease: 'power2.inOut' },
            1.40
          )
          .to(
            textItemRefs.current[2],
            { opacity: 1, y: 0, duration: 0.25, ease: 'power2.inOut', pointerEvents: 'auto' },
            1.50
          )
          .to(
            imageLayerRefs.current[2],
            { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.inOut' },
            1.50
          );

        // ── Transition 2 -> 3 (occurs at t = 2.15 to t = 2.45)
        tl.to(
          textItemRefs.current[2],
          { opacity: 0, y: -16, duration: 0.25, ease: 'power2.inOut', pointerEvents: 'none' },
          2.15
        )
          .to(
            imageLayerRefs.current[2],
            { opacity: 0, scale: 0.96, duration: 0.25, ease: 'power2.inOut' },
            2.15
          )
          .to(
            textItemRefs.current[3],
            { opacity: 1, y: 0, duration: 0.25, ease: 'power2.inOut', pointerEvents: 'auto' },
            2.25
          )
          .to(
            imageLayerRefs.current[3],
            { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.inOut' },
            2.25
          );

        ScrollTrigger.refresh();
      }, sectionRef);
    });

    const handleWindowLoad = () => {
      ScrollTrigger.refresh();
    };
    window.addEventListener('load', handleWindowLoad);
    window.addEventListener('resize', handleWindowLoad);

    return () => {
      cancelAnimationFrame(rId);
      window.removeEventListener('load', handleWindowLoad);
      window.removeEventListener('resize', handleWindowLoad);
      if (ctx) {
        ctx.revert();
      }
    };
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      className="features-scroll-section relative w-full h-screen min-h-[640px] bg-black text-white selection:bg-white/20 border-t border-white/[0.06] flex flex-col justify-between pt-20 pb-6 sm:pt-24 sm:pb-8 px-4 sm:px-6 lg:px-8 box-border"
      aria-label="Features Showcase"
    >
      {/* Section Header with clearance for top floating navbar */}
      <div className="text-center max-w-2xl mx-auto mb-3 sm:mb-5 shrink-0">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 text-[10px] font-semibold tracking-wider uppercase mb-1.5">
          <span>Enterprise Threat Defense</span>
        </div>
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-[-0.03em] text-white leading-snug">
          Next-generation autonomous cybersecurity architecture.
        </h2>
        <p className="mt-1 text-zinc-400 text-xs sm:text-[13px] max-w-xl mx-auto leading-normal line-clamp-2">
          PhishLens Agent combines real-time multi-agent reasoning, deep neural vision models, and sandboxed visual forensics to safeguard your organization.
        </p>
      </div>

      {/* Side-by-Side Pinned Content Grid */}
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center flex-1 my-auto min-h-0">
        {/* ── Left Column: Lateral Progress Indicator & In-Place Text Slider ── */}
        <div className="lg:col-span-5 relative flex gap-4 sm:gap-6 items-center min-h-[220px] sm:min-h-[260px]">
          {/* Lateral Progress Indicator Track */}
          <div className="hidden sm:flex flex-col items-center flex-shrink-0 select-none py-1">
            <div className="text-[10px] font-mono text-amber-400 font-semibold mb-1.5">
              0{activeIndex + 1}
            </div>
            <div className="w-[2px] h-[160px] sm:h-[180px] bg-white/[0.1] relative rounded-full overflow-hidden">
              <div
                ref={indicatorFillRef}
                className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-amber-400 via-emerald-400 to-cyan-400 origin-top transform-gpu rounded-full"
              />
            </div>
            <div className="text-[10px] font-mono text-zinc-600 font-semibold mt-1.5">
              04
            </div>
          </div>

          {/* In-Place Single Active Text Slide Container */}
          <div className="relative flex-1 w-full min-h-[200px] sm:min-h-[240px] flex items-center">
            {FEATURES_DATA.map((feature, idx) => {
              const FeatureIcon = feature.Icon;

              return (
                <div
                  key={feature.id}
                  ref={(el) => {
                    textItemRefs.current[idx] = el;
                  }}
                  className="w-full absolute inset-0 flex flex-col justify-center select-none"
                  style={{ willChange: 'transform, opacity' }}
                >
                  {/* Title with Inline SVG Icon */}
                  <div className="flex items-center gap-2.5 mb-2.5 sm:mb-3">
                    <FeatureIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white shrink-0" />
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                      {feature.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-[#888891] text-xs sm:text-sm leading-relaxed mb-4 font-normal max-w-lg">
                    {feature.description}
                  </p>

                  {/* Feature Checkmark Bullets */}
                  <ul className="space-y-2 sm:space-y-2.5">
                    {feature.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-center gap-2.5 text-xs sm:text-[13px] text-[#9a9aa2]">
                        <Check className="w-3.5 h-3.5 text-[#71717a] shrink-0" strokeWidth={2.2} />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right Column: Direct Image Showcase (No Outer Window / Background Frame) ── */}
        <div className="lg:col-span-7 relative w-full flex items-center justify-center">
          <div className="relative w-full aspect-[16/10] max-h-[340px] sm:max-h-[400px] flex items-center justify-center">
            {FEATURES_DATA.map((feature, idx) => (
              <img
                key={feature.id}
                ref={(el) => {
                  imageLayerRefs.current[idx] = el;
                }}
                src={feature.image}
                alt={feature.alt}
                className="absolute inset-0 w-full h-full object-contain rounded-xl pointer-events-none select-none"
                style={{ willChange: 'transform, opacity' }}
                loading="eager"
                onLoad={() => ScrollTrigger.refresh()}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
