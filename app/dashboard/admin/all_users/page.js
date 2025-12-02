"use server";
import React from "react";
import { AllUsersProvider } from "./context";
import AllUsersContent from "./content";




export default async function AllUsersPages() {
    return (
        <>
            <AllUsersProvider>
                <AllUsersContent />
            </AllUsersProvider>
        </>
    );
}