import React, { useState, useEffect, useMemo } from "react";
import { ADToBS } from "bikram-sambat-js";
import { jwtDecode } from 'jwt-decode';  // Changed from default import to named import
import { AiOutlineMessage } from "react-icons/ai";
import SMSModal from "./SMSModal";

const Message_Todaytable = () => {
    const [meetings, setMeetings] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [showNoMeetings, setShowNoMeetings] = useState(false);
    const meetingsPerPage = 6;
    const [showSessionAlert, setShowSessionAlert] = useState(false);
    const [selectedMeetings, setSelectedMeetings] = useState(new Set()); //  Track selected meetings

    // Session expiration check
    useEffect(() => {
        const checkTokenExpiration = () => {
            const token = localStorage.getItem("token");
            if (!token) return;

            try {
                const decodedToken = jwtDecode(token);
                const currentTime = Date.now() / 1000;

                if (decodedToken.exp < currentTime) {
                    handleSessionExpiration();
                }
            } catch (error) {
                console.error("Token decoding error:", error);
            }
        };

        // Initial check
        checkTokenExpiration();

        // Check every 60 seconds
        const interval = setInterval(checkTokenExpiration, 60000);

        return () => clearInterval(interval);
    }, []);

    const handleSessionExpiration = () => {
        localStorage.removeItem("token");
        setShowSessionAlert(true);
    };

    const getKathmanduDate = () => {
        const now = new Date();
        const offset = 5.75 * 60; // Kathmandu is UTC+5:45 (5.75 hours)
        const kathmanduTime = new Date(now.getTime() + offset * 60 * 1000);
        return kathmanduTime.toISOString().split("T")[0]; // Format: YYYY-MM-DD
    };
    const formatTime = (timeStr) => {
        if (!timeStr) return "";
        const [hours, minutes] = timeStr.split(":");
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? "PM" : "AM";
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}:${minutes} ${ampm}`;
    };

    const formatDate = (date) => {
        const d = new Date(date);
        return d.toISOString().split("T")[0]; // Convert to YYYY-MM-DD format
    };

    const convertADDateToBS = (adDate) => {
        try {
            const bsDate = ADToBS(adDate); // Convert AD to BS
            return bsDate;
        } catch (error) {
            console.error("Error converting AD to BS:", error);
            return null;
        }
    };
    useEffect(() => {
        const fetchMeetings = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch("http://localhost:5001/api/meetings", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) throw new Error("Failed to fetch meetings");

                let data = await response.json();

                // Filter and convert dates
                data = data.filter((meeting) => meeting.date && meeting.time); // Remove invalid entries

                // Convert AD date to BS for filtering
                const todayAD = new Date(getKathmanduDate());
                const todayBS = convertADDateToBS(todayAD);

                // Convert meeting AD dates to BS and filter
                data.forEach((meeting) => {
                    meeting.date = meeting.date.split("T")[0];
                });

                data = data.filter((meeting) => {
                    const isMatch = (meeting.date) === (todayBS);
                    // console.log(`Meeting Date: ${meeting.date}, Today BS: ${todayBS}, Match: ${isMatch}`);
                    return isMatch;
                });

                data = data.filter((meeting) => {
                    const isInternal = (meeting.meeting_type) === ("internal");
                    return isInternal;
                });

                data.sort((a, b) => {

                    // Convert time to minutes for sorting
                    const [hourA, minuteA] = a.time.split(":").map(Number);
                    const [hourB, minuteB] = b.time.split(":").map(Number);

                    return hourA * 60 + minuteA - (hourB * 60 + minuteB); // Sort by time (ascending)
                });
                setMeetings(data);
                // Set showNoMeetings based on whether there are meetings
                if (data.length === 0) {
                    setTimeout(() => setShowNoMeetings(true), 200); // Delay for smooth transition
                } else {
                    setShowNoMeetings(false);
                }
            } catch (error) {
                console.error("Error fetching meetings:", error);
                setMeetings([]); // Prevent blank page
            }
        };

        fetchMeetings();
        const interval = setInterval(fetchMeetings, 1200000); // Fetch every 20min

        return () => clearInterval(interval); // Cleanup on unmount
    }, []);

    //pagination logic
    const indexOfLastMeeting = currentPage * meetingsPerPage;
    const indexOfFirstMeeting = indexOfLastMeeting - meetingsPerPage;
    const currentMeetings = meetings.slice(indexOfFirstMeeting, indexOfLastMeeting);

    const totalPages = Math.ceil(meetings.length / meetingsPerPage);
    const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    const goToPrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

    // Function to check if a meeting is selected
    const isSelected = (meetingIndex) => selectedMeetings.has(meetingIndex);

    // Function to toggle checkbox selection
    const handleCheckboxChange = (meetingId) => {
        setSelectedMeetings((prevSelected) => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(meetingId)) {
                newSelected.delete(meetingId);
            } else {
                newSelected.add(meetingId);
            }
            return newSelected;
        });
    };

    return (
        <>
            <div className="bg-gray-200 p-[1vw] md:pb-[0.5vh] md:px-[1vw] md:mt-[0] pt-[2vh] md:pt-[0]">
            <div className="flex justify-end mr-5 mb-[1.5vh]">
                <button 
                 onClick={handleSendSMSButtonClick}
                 className="flex space-x-2 justify-center items-center border-none px-2 py-1 rounded-4xl w-[10rem]
                                bg-blue-600 text-white 
                                hover:bg-blue-700 cursor-pointer
                                ">
                    <AiOutlineMessage  className="text-2xl"/>
                    <span className="text-xl">Send SMS</span>
                </button>
                </div>
                {/* Add the SMS Modal */}
        {showSMSModal && <SMSModal />}


                {/* Session Expiration Modal */}
                {showSessionAlert && (
                    <div className="fixed inset-0 bg-gray-500/50 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                            <div className="text-center">
                                <h3 className="text-lg font-medium mb-4">⏳ Session Expired</h3>
                                <p className="mb-4">Your session has expired. Please log in again.</p>
                                <button
                                    onClick={() => {
                                        localStorage.removeItem("token");
                                        window.location.href = "/";
                                    }}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                >
                                    Go to Login
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="overflow-x-auto">
                    {/* Show "No Meetings" when there are no meetings */}
                    {showNoMeetings ? (

                        <div className="text-center text-2xl font-semibold text-gray-600 p-4">
                            <img
                                src="/calender.png"
                                alt="No Meetings"
                                className="mx-auto mb-4"
                                style={{ width: "80px", height: "80px" }}
                            />
                            No Meetings Scheduled
                        </div>


                    ) : (
                        <>
                            {meetings.length > 0 && (
                                <table className="w-full border-collapse border text-xl border-gray-400">
                                    <thead>
                                        <tr className="bg-gray-200">
                                            <th className="border w-[4vw] border-gray-400 px-4 py-2">
                                                <button >
                                                    ✔
                                                </button>
                                                </th>
                                            <th className="border w-[4vw] border-gray-400 px-4 py-2">SN</th>
                                            <th className="border w-[13vw] border-gray-400 px-4 py-2">Date</th>
                                            <th className="border w-[11vw] border-gray-400 px-4 py-2">Time</th>
                                            <th className="border w-[20vw] border-gray-400 px-4 py-2">Meeting Type</th>
                                            <th className="border w-[20vw] border-gray-400 px-4 py-2">Location</th>
                                            <th className="border w-[35vw] border-gray-400 px-4 py-2">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentMeetings.map((meeting, index) => {
                                            const isHighPriority = meeting.priority === "high";

                                            return (
                                                <tr
                                                    key={index}
                                                    className={`text-center ${isHighPriority
                                                        ? "bg-blue-300 text-black hover:bg-blue-400 odd:bg-blue-300 "
                                                        : "odd:bg-white hover:bg-gray-100"
                                                        }`}
                                                >
                                                    <td className="border w-[4vw] border-gray-400 px-4 py-2">
                                                        <input type="checkbox"
                                                            name="select"
                                                            value="select"
                                                            checked={isSelected((currentPage - 1) * meetingsPerPage + index + 1)} //  Maintain selection state
                                                            onChange={() => handleCheckboxChange((currentPage - 1) * meetingsPerPage + index + 1)} //  Toggle selection
                                                            className="w-5 h-5 cursor-pointer" />
                                                    </td>
                                                    <td className="border w-[4vw] border-gray-400 px-4 py-2">
                                                        {(currentPage - 1) * meetingsPerPage + index + 1}
                                                    </td>
                                                    <td className="border w-[13vw] border-gray-400 px-4 py-2">
                                                        {formatDate(meeting.date)}
                                                    </td>
                                                    <td className="border w-[11vw] border-gray-400 px-4 py-2">
                                                        {formatTime(meeting.time)}
                                                    </td>
                                                    <td className="border w-[20vw] border-gray-400 px-4 py-2">{meeting.type}</td>
                                                    <td className="border w-[20vw] border-gray-400 px-4 py-2">{meeting.location}</td>
                                                    <td className="border w-[35vw] border-gray-400 px-4 py-2">{meeting.description}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                            {/* Pagination - Show only when meetings exist */}
                            {meetings.length > meetingsPerPage && (
                                <div className="flex justify-center mt-4 space-x-3">
                                    <button
                                        onClick={goToPrevPage}
                                        disabled={currentPage === 1}
                                        className={`px-2 py-1 bg-blue-600 text-white rounded-4xl ${currentPage === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
                                            }`}
                                    >
                                        Prev
                                    </button>
                                    <span className="text-md font-sans">
                                        {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={goToNextPage}
                                        disabled={currentPage === totalPages}
                                        className={`px-2 py-1 bg-blue-600 text-white rounded-4xl ${currentPage === totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
                                            }`}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default Message_Todaytable;
