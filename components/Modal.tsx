"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  useCallback,
} from "react";
import { gsap } from "gsap";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  backdropClassName?: string;
  closeOnBackdropClick?: boolean;
};

const Modal = ({
  isOpen,
  onClose,
  children,
  className = "",
  backdropClassName = "",
  closeOnBackdropClick = true,
}: ModalProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback((): void => {
    if (isClosing) return;
    setIsClosing(true);

    if (modalRef.current && backdropRef.current) {
      gsap.to(modalRef.current, {
        opacity: 0,
        y: 50,
        scale: 0.95,
        filter: "blur(8px)",
        duration: 0.3,
        ease: "power2.in",
      });

      gsap.to(backdropRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          setIsVisible(false);
          setIsClosing(false);
          onClose();
        },
      });
    } else {
      setIsVisible(false);
      setIsClosing(false);
      onClose();
    }
  }, [isClosing, onClose]);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsClosing(false);
    } else if (isVisible) {
      handleClose();
    }
  }, [isOpen, isVisible, handleClose]);

  useEffect(() => {
    if (isVisible && !isClosing && modalRef.current && backdropRef.current) {
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" }
      );

      gsap.fromTo(
        modalRef.current,
        {
          opacity: 0,
          y: 100,
          scale: 0.9,
          filter: "blur(10px)",
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          duration: 0.5,
          ease: "power3.out",
          delay: 0.1,
        }
      );
    }
  }, [isVisible, isClosing]);

  const handleBackdropClick = (): void => {
    if (closeOnBackdropClick) {
      handleClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        ref={backdropRef}
        className={`absolute inset-0 bg-black/50 ${backdropClassName}`}
        onClick={handleBackdropClick}
      />
      <div ref={modalRef} className={`relative ${className}`}>
        {children}
      </div>
    </div>
  );
};

export default Modal;
