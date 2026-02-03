import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";

export function useAnimatedModal(
  isOpen: boolean,
  onClose: () => void
): {
  modalRef: React.RefObject<HTMLDivElement | null>;
  backdropRef: React.RefObject<HTMLDivElement | null>;
  isVisible: boolean;
  handleClose: () => void;
} {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const prevIsOpen = useRef(isOpen);

  // Handle opening
  useEffect(() => {
    if (isOpen === true && isVisible === false && isClosing === false) {
      // Use requestAnimationFrame to avoid synchronous setState in effect
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }
  }, [isOpen, isVisible, isClosing]);

  // Handle external close (when parent sets isOpen to false) - run exit animation
  useEffect(() => {
    // Detect when isOpen changes from true to false (external close)
    if (
      prevIsOpen.current === true &&
      isOpen === false &&
      isVisible === true &&
      isClosing === false
    ) {
      // Use requestAnimationFrame to avoid synchronous setState in effect
      requestAnimationFrame(() => {
        setIsClosing(true);
        if (modalRef.current !== null && backdropRef.current !== null) {
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
            },
          });
        } else {
          setIsVisible(false);
          setIsClosing(false);
        }
      });
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, isVisible, isClosing]);

  // Run entrance animation
  useEffect(() => {
    if (
      isVisible &&
      !isClosing &&
      modalRef.current !== null &&
      backdropRef.current
    ) {
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" }
      );
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, y: 100, scale: 0.9, filter: "blur(10px)" },
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

  const handleClose = (): void => {
    if (isClosing === true) return;
    setIsClosing(true);
    if (modalRef.current !== null && backdropRef.current !== null) {
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
  };

  return { modalRef, backdropRef, isVisible, handleClose };
}
