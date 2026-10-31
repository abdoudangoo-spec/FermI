import LegalScreen from '../../src/components/LegalScreen';
import { CONFIDENTIALITE_SECTIONS } from '../../src/constants/legal';

export default function Confidentialite() {
  return <LegalScreen title="Confidentialité" sections={CONFIDENTIALITE_SECTIONS} />;
}
