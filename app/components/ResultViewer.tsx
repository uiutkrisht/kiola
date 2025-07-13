'use client';

import React, { JSX } from 'react';
import { ComparisonResult, ComparisonSummary } from '../types';

interface ResultViewerProps {
  differences: ComparisonResult[];
  summary: ComparisonSummary;
}

const ResultViewer: React.FC<ResultViewerProps> = ({ differences, summary }) => {
  const getSeverityColor = (severity: 'high' | 'medium' | 'low'): string => {
    switch (severity) {
      case 'high':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return '';
    }
  };

  const getTypeIcon = (type: string): JSX.Element => {
    // Map style-related issue types to 'style' for icon display
    const baseType = ['font-size', 'font-weight', 'color', 'spacing', 'other'].includes(type) 
      ? 'style' 
      : type as 'text' | 'layout' | 'style' | 'missing';
    switch (baseType) {
      case 'text':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
          </svg>
        );
      case 'layout':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
          </svg>
        );
      case 'style':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
          </svg>
        );
      case 'missing':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m6 4.125 2.25 2.25m0 0 2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
          </svg>
        );
      default:
        return <></>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Summary Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Comparison Results</h3>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              summary.score >= 90 ? 'bg-green-100 text-green-800' :
              summary.score >= 70 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {summary.score}% Match
            </span>
          </div>
          
          <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Elements</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">{summary.total}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Matched Elements</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">{summary.matched}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Issues Found</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">{differences.length}</dd>
            </div>
          </dl>

          <div className="mt-6 grid grid-cols-2 gap-4">
            {/* Issues by Type */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Issues by Type</h4>
              <div className="space-y-1">
                {Object.entries(summary.byType).map(([type, count]) => (
                  count > 0 && (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{type}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  )
                ))}
              </div>
            </div>

            {/* Issues by Severity */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Issues by Severity</h4>
              <div className="space-y-1">
                {Object.entries(summary.bySeverity).map(([severity, count]) => (
                  count > 0 && (
                    <div key={severity} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{severity}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Differences List */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Detailed Differences</h3>
        <div className="space-y-3">
          {differences.map((diff, index) => (
            <div
              key={index}
              className={`rounded-lg border p-4 ${getSeverityColor(diff.severity)}`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {getTypeIcon(diff.type)}
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {diff.element}
                    </p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize">
                      {diff.severity}
                    </span>
                  </div>
                  <div className="mt-2 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-medium text-xs uppercase tracking-wide">Figma</p>
                        <p className="mt-1">{JSON.stringify(diff.figmaValue, null, 2)}</p>
                      </div>
                      <div>
                        <p className="font-medium text-xs uppercase tracking-wide">Live Site</p>
                        <p className="mt-1">{JSON.stringify(diff.liveValue, null, 2)}</p>
                      </div>
                    </div>
                    {diff.recommendation && (
                      <div className="mt-3 flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mt-0.5 mr-1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                        </svg>
                        <p className="text-sm">{diff.recommendation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResultViewer; 