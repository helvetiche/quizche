"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { gsap } from "gsap";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  backdropClassName?: string;
  closeOnBackdropClick?: boolean;
}

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

  // Handle open animation
  useEffect(() => {
    if (isOpen && !isClosing) {
      setIsVisible(true);
    }
  }, [isOpen, isClosing]);

  // Animate on visibility change
  useEffect(() => {
    if (isVisible && !isClosing && modalRef.current && backdropRef.current) {
      // Animate backdrop in
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" }
      );

      // Animate modal with masonry-like effect
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

  // Handle close with animation
  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);

    if (modalRef.current && backdropRef.current) {
      // Animate modal out
      gsap.to(modalRef.current, {
        opacity: 0,
        y: 50,
        scale: 0.95,
        filter: "blur(8px)",
        duration: 0.3,
        ease: "power2.in",
      });

      // Animate backdrop out
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
  };

  // Handle backdrop click
  const handleBackdropClick = () => {
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
