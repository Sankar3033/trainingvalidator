/**
 * Single place that maps a short name to a Font Awesome icon.
 * Icons are imported individually so the bundler tree-shakes the rest away.
 */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRotateRight,
  faBan,
  faBars,
  faBolt,
  faCamera,
  faCheck,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faChevronUp,
  faCircleCheck,
  faCircleInfo,
  faDownload,
  faExpand,
  faGear,
  faGraduationCap,
  faIdCard,
  faImage,
  faKey,
  faLink,
  faMagnifyingGlass,
  faPenToSquare,
  faPlus,
  faPowerOff,
  faPrint,
  faQrcode,
  faRightFromBracket,
  faRotate,
  faStop,
  faTableColumns,
  faTrashCan,
  faTriangleExclamation,
  faUpRightFromSquare,
  faUser,
  faUserGear,
  faUsers,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

const ICONS = {
  "arrow-left": faArrowLeft,
  ban: faBan,
  bars: faBars,
  bolt: faBolt,
  camera: faCamera,
  check: faCheck,
  "check-circle": faCircleCheck,
  "chevron-left": faChevronLeft,
  "chevron-right": faChevronRight,
  "chevron-up": faChevronUp,
  "chevron-down": faChevronDown,
  dashboard: faTableColumns,
  download: faDownload,
  edit: faPenToSquare,
  expand: faExpand,
  "external-link": faUpRightFromSquare,
  gear: faGear,
  image: faImage,
  info: faCircleInfo,
  key: faKey,
  link: faLink,
  logout: faRightFromBracket,
  "power-off": faPowerOff,
  plus: faPlus,
  print: faPrint,
  qrcode: faQrcode,
  refresh: faArrowRotateRight,
  rotate: faRotate,
  search: faMagnifyingGlass,
  stop: faStop,
  training: faGraduationCap,
  trash: faTrashCan,
  user: faUser,
  users: faUsers,
  "user-gear": faUserGear,
  badge: faIdCard,
  warning: faTriangleExclamation,
  xmark: faXmark,
};

export default function Icon({ name, className = "", ...rest }) {
  const icon = ICONS[name];
  if (!icon) return null;
  return (
    <FontAwesomeIcon icon={icon} className={`fa-ico ${className}`.trim()} {...rest} />
  );
}
