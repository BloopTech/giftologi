"use server";
import React from "react";




export default async function RegistryPage({ params }) {
    const getParams = await params;
    console.log("getParams", getParams);
    return (
        <div>
            <h1>Registry Page</h1>
        </div>
    );
}