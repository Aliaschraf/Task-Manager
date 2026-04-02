import { useRef } from "react";
import useAutoResizeTextarea from "../hooks/useAutoResizeTextarea";

type TextBoxProps = {
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  placeholder?: string;
};

function TextBox({ value, onChange, onEnter, placeholder }: TextBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const resizeToContent = useAutoResizeTextarea(textareaRef, value);

  return (
    <textarea
      ref={textareaRef}
      className="textbox-input"
      value={value}
      placeholder={placeholder}
      rows={1}
      onChange={(event) => {
        onChange(event.target.value);
        resizeToContent();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          onEnter();
        }
      }}
    />
  );
}

export default TextBox;
