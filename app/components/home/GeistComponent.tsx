// import { ReactComponent as Glyph } from "./geist.svg";
import "../../styles/components/geist.scss";
import { MessageCircle } from 'lucide-react';

interface GeistComponentProps {
  mode: string;
  onClick?: () => void;
  texts: string;
  className?: string;
}
const GeistComponent: React.FC<GeistComponentProps> = ({
  mode,
  onClick,
  texts,
  className

}) => {
  console.log("texts::",texts);
  return (
      <div
          className={`geist-container ${className}`}
          // style={{
          //     // position: "absolute",
          //     // left: `${texts.length}ch`,
          //     // bottom: "0",
          // }}
          onClick={onClick}
      >
          <MessageCircle id="geist" className={mode} />
      </div>
  );
};


export default GeistComponent;
