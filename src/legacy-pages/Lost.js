import React, { useEffect } from "react";

const Lost = () => {
    useEffect(() => {
        // Prevent back navigation
        const blockNavigation = () => {
            window.history.pushState(null, "", window.location.href);
        };

        window.history.pushState(null, "", window.location.href);
        window.addEventListener("popstate", blockNavigation);

        // Disable all input interactions
        const disableInput = (event) => event.preventDefault();
        window.addEventListener("keydown", disableInput);
        window.addEventListener("mousedown", disableInput);

        // Terminate after 5 seconds
        const timeout = setTimeout(() => {
            document.body.innerHTML = ""; // Remove all content
            document.body.style.backgroundColor = "black"; // Blackout screen
            document.title = "Session Terminated"; // Change tab title

            // Try to close the tab
            window.close(); 

            // If window.close() fails, try reloading with a blank page
            setTimeout(() => {
                window.location.replace("about:blank");
            }, 1000);
        }, 5000);

        return () => {
            clearTimeout(timeout);
            window.removeEventListener("popstate", blockNavigation);
            window.removeEventListener("keydown", disableInput);
            window.removeEventListener("mousedown", disableInput);
        };
    }, []);

    return (
        <div className="lost-container">
            <div className="blood-drip"></div> {/* Dripping Blood Effect */}

            <h1 className="lost-title eerie-text">💀 YOU LOST 💀</h1>

            <p className="lost-message eerie-text">
                Oh no, detective... You *really* thought you had it, huh? How adorable.
            </p>

            <p className="lost-message eerie-text">
                The case remains unsolved, and the murderer? Well, they're probably enjoying a nice cup of tea right now... You're left in the dark. The silence... remains. Adios.
            </p>

            <p className="lost-message eerie-text">
                ☠️ Maybe next time, don’t lose hope, detective. ☠️
            </p>
        </div>
    );
};

export default Lost;
