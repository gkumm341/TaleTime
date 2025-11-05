'use client'

import React, { useState } from 'react'

const pages = [
    {
        id: 1,
        content: "Once upon a time, in a magical kingdom far away, there lived a curious little fox named Luna."
    },
    {
        id: 2,
        content: "Luna loved to explore the enchanted forest, discovering new wonders around every corner."
    },
    {
        id: 3,
        content: "One day, she found a glowing crystal that would change her life forever..."
    },
    {
        id: 4,
        content: "The crystal whispered ancient secrets and granted Luna the power to understand all forest creatures."
    },
    {
        id: 5,
        content: "And so began Luna's greatest adventure, filled with friendship, magic, and discovery. The End."
    }
]

export default function TestPage() {
    const [currentPage, setCurrentPage] = useState(0)
    const [isFlipping, setIsFlipping] = useState(false)

    const handlePageClick = () => {
        if (currentPage < pages.length - 1 && !isFlipping) {
            setIsFlipping(true)
            setTimeout(() => {
                setCurrentPage(prev => prev + 1)
                setIsFlipping(false)
            }, 1800) // Matches the enhanced 1.8s animation duration
        }
    }

    const resetBook = () => {
        setCurrentPage(0)
        setIsFlipping(false)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-8">
            {/* CSS Styles */}
            <style jsx>{`
                .book-container {
                    perspective: 1500px;
                    perspective-origin: center center;
                }
                
                .flip-page {
                    animation: realPageFlip 1.8s cubic-bezier(0.23, 1, 0.32, 1);
                    transform-style: preserve-3d;
                    transform-origin: left center;
                }
                
                @keyframes realPageFlip {
                    0% { 
                        transform: rotateY(0deg) rotateX(0deg) translateZ(0px) scale(1);
                        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                        filter: brightness(1);
                    }
                    10% {
                        transform: rotateY(-15deg) rotateX(2deg) translateZ(30px) scale(1.02);
                        box-shadow: -5px 8px 25px rgba(0,0,0,0.2);
                        filter: brightness(1.1);
                    }
                    25% {
                        transform: rotateY(-45deg) rotateX(4deg) translateZ(60px) scale(1.05);
                        box-shadow: -15px 12px 35px rgba(0,0,0,0.25);
                        filter: brightness(1.2);
                    }
                    50% { 
                        transform: rotateY(-90deg) rotateX(6deg) translateZ(80px) scale(1.08);
                        box-shadow: -25px 20px 45px rgba(0,0,0,0.35);
                        filter: brightness(1.3);
                    }
                    75% {
                        transform: rotateY(-135deg) rotateX(4deg) translateZ(60px) scale(1.05);
                        box-shadow: -15px 12px 35px rgba(0,0,0,0.25);
                        filter: brightness(1.2);
                    }
                    90% {
                        transform: rotateY(-165deg) rotateX(2deg) translateZ(30px) scale(1.02);
                        box-shadow: -5px 8px 25px rgba(0,0,0,0.2);
                        filter: brightness(1.1);
                    }
                    100% { 
                        transform: rotateY(-180deg) rotateX(0deg) translateZ(0px) scale(1);
                        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                        filter: brightness(1);
                    }
                }
                
                .page-curl {
                    animation: curlEffect 1.8s cubic-bezier(0.23, 1, 0.32, 1);
                    transform-origin: left center;
                }
                
                @keyframes curlEffect {
                    0% { 
                        clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%);
                        filter: drop-shadow(0 0 0 transparent);
                    }
                    15% {
                        clip-path: polygon(0% 0%, 95% 2%, 97% 98%, 0% 100%);
                        filter: drop-shadow(8px 4px 8px rgba(0,0,0,0.15));
                    }
                    35% {
                        clip-path: polygon(0% 0%, 85% 8%, 88% 92%, 0% 100%);
                        filter: drop-shadow(18px 10px 18px rgba(0,0,0,0.25));
                    }
                    50% {
                        clip-path: polygon(0% 0%, 75% 15%, 80% 85%, 0% 100%);
                        filter: drop-shadow(25px 15px 25px rgba(0,0,0,0.35));
                    }
                    65% {
                        clip-path: polygon(0% 0%, 85% 8%, 88% 92%, 0% 100%);
                        filter: drop-shadow(18px 10px 18px rgba(0,0,0,0.25));
                    }
                    85% {
                        clip-path: polygon(0% 0%, 95% 2%, 97% 98%, 0% 100%);
                        filter: drop-shadow(8px 4px 8px rgba(0,0,0,0.15));
                    }
                    100% {
                        clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%);
                        filter: drop-shadow(0 0 0 transparent);
                    }
                }
                
                .page-highlight {
                    animation: pageGlow 1.8s cubic-bezier(0.23, 1, 0.32, 1);
                }
                
                @keyframes pageGlow {
                    0%, 100% { 
                        background: linear-gradient(90deg, transparent 0%, transparent 100%);
                        opacity: 0;
                    }
                    25% {
                        background: linear-gradient(120deg, 
                            transparent 0%, 
                            rgba(255,255,255,0.4) 30%, 
                            rgba(255,248,220,0.6) 50%, 
                            rgba(255,255,255,0.4) 70%, 
                            transparent 100%
                        );
                        opacity: 0.7;
                    }
                    50% {
                        background: linear-gradient(135deg, 
                            transparent 0%, 
                            rgba(255,255,255,0.8) 20%, 
                            rgba(255,248,220,0.9) 40%, 
                            rgba(255,235,180,1) 50%, 
                            rgba(255,248,220,0.9) 60%, 
                            rgba(255,255,255,0.8) 80%, 
                            transparent 100%
                        );
                        opacity: 1;
                    }
                    75% {
                        background: linear-gradient(150deg, 
                            transparent 0%, 
                            rgba(255,255,255,0.4) 30%, 
                            rgba(255,248,220,0.6) 50%, 
                            rgba(255,255,255,0.4) 70%, 
                            transparent 100%
                        );
                        opacity: 0.7;
                    }
                }
                
                .shadow-wave {
                    animation: shadowWave 1.8s cubic-bezier(0.23, 1, 0.32, 1);
                }
                
                @keyframes shadowWave {
                    0% { 
                        transform: translateX(0px) skewX(0deg) scaleX(1);
                        opacity: 0.1;
                        background: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.05) 50%, transparent 100%);
                    }
                    25% {
                        transform: translateX(-20px) skewX(-8deg) scaleX(1.1);
                        opacity: 0.3;
                        background: linear-gradient(125deg, transparent 0%, rgba(139,69,19,0.15) 25%, rgba(0,0,0,0.1) 50%, rgba(139,69,19,0.15) 75%, transparent 100%);
                    }
                    50% {
                        transform: translateX(-40px) skewX(-15deg) scaleX(1.2);
                        opacity: 0.5;
                        background: linear-gradient(135deg, transparent 0%, rgba(139,69,19,0.25) 20%, rgba(0,0,0,0.2) 40%, rgba(92,51,23,0.3) 50%, rgba(0,0,0,0.2) 60%, rgba(139,69,19,0.25) 80%, transparent 100%);
                    }
                    75% {
                        transform: translateX(-60px) skewX(-8deg) scaleX(1.1);
                        opacity: 0.3;
                        background: linear-gradient(145deg, transparent 0%, rgba(139,69,19,0.15) 25%, rgba(0,0,0,0.1) 50%, rgba(139,69,19,0.15) 75%, transparent 100%);
                    }
                    100% {
                        transform: translateX(-80px) skewX(0deg) scaleX(1);
                        opacity: 0.1;
                        background: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.05) 50%, transparent 100%);
                    }
                }
            `}</style>
            
            <div className="book-container">
                {/* Book Container */}
                <div 
                    className="relative w-96 h-64 cursor-pointer transform transition-all duration-300 hover:scale-105"
                    onClick={handlePageClick}
                    style={{ perspective: '2000px' }}
                >
                    {/* Book Base/Shadow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-900 to-amber-800 rounded-r-lg transform rotate-1 shadow-2xl transition-all duration-300"></div>
                    
                    {/* Previous Page (Static Background) */}
                    <div className="absolute w-full h-full bg-gradient-to-br from-amber-50 to-orange-50 rounded-r-lg shadow-xl border-l-4 border-amber-800 overflow-hidden">
                        <div className="p-8 h-full flex flex-col justify-center">
                            {currentPage > 0 && (
                                <>
                                    <div className="text-lg text-amber-900 leading-relaxed font-serif opacity-20">
                                        {pages[currentPage - 1]?.content}
                                    </div>
                                    <div className="absolute bottom-4 right-6 text-sm text-amber-600 opacity-20">
                                        {currentPage} / {pages.length}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    
                    {/* Current Page (Flipping) */}
                    <div 
                        className={`absolute w-full h-full bg-gradient-to-br from-white to-orange-50 rounded-r-lg shadow-2xl border-l-4 border-amber-800 overflow-hidden ${
                            isFlipping ? 'flip-page page-curl' : ''
                        }`}
                        style={{ 
                            transformStyle: 'preserve-3d',
                            backfaceVisibility: 'hidden',
                            transformOrigin: 'left center'
                        }}
                    >
                        {/* Front of Current Page */}
                        <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
                            <div className="p-8 h-full flex flex-col justify-center relative">
                                <div className="text-lg text-amber-900 leading-relaxed font-serif relative z-10">
                                    {pages[currentPage]?.content}
                                </div>
                                
                                {/* Page Number */}
                                <div className="absolute bottom-4 right-6 text-sm text-amber-600 z-10">
                                    {currentPage + 1} / {pages.length}
                                </div>
                                
                                {/* Enhanced page effects during flip */}
                                {isFlipping && (
                                    <>
                                        <div className="absolute inset-0 page-highlight pointer-events-none z-20"></div>
                                        <div className="absolute inset-0 shadow-wave pointer-events-none z-15"></div>
                                    </>
                                )}
                            </div>
                        </div>
                        
                        {/* Back of Current Page (Next Page Preview) */}
                        <div 
                            className="absolute inset-0"
                            style={{ 
                                transform: 'rotateY(180deg)', 
                                backfaceVisibility: 'hidden' 
                            }}
                        >
                            <div className="p-8 h-full flex flex-col justify-center bg-gradient-to-br from-white to-orange-50 rounded-r-lg relative">
                                {currentPage < pages.length - 1 && (
                                    <>
                                        <div className="text-lg text-amber-900 leading-relaxed font-serif relative z-10" style={{ transform: 'scaleX(-1)' }}>
                                            {pages[currentPage + 1]?.content}
                                        </div>
                                        <div className="absolute bottom-4 left-6 text-sm text-amber-600 z-10" style={{ transform: 'scaleX(-1)' }}>
                                            {currentPage + 2} / {pages.length}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Book Spine */}
                    <div className="absolute left-0 top-0 w-2 h-full bg-gradient-to-b from-amber-700 to-amber-900 rounded-l-sm shadow-inner z-30 border-r border-amber-600"></div>
                </div>
                
                {/* Instructions */}
                <div className="mt-8 text-center">
                    {currentPage < pages.length - 1 ? (
                        <p className="text-amber-700 text-sm">Click the book to turn the page</p>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-amber-700 text-sm">Story complete!</p>
                            <button 
                                onClick={resetBook}
                                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
                            >
                                Read Again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}