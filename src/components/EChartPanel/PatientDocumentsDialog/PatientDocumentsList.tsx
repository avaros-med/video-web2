import { Spinner, SpinnerSize } from '@blueprintjs/core'
import moment from 'moment'
import { useEffect, useMemo } from 'react'
import styled from 'styled-components'
import { DemographicDocument } from '../../../services/models/DemographicDocument.model'
import { IconButton } from '../../UI/IconButton'
import { FontWeightBoldStyles, TextHintStyles } from '../../UI/styles/styles'
import { useHttpDemographic } from '../EChartView/useHttpDemographic'
import { useEChartContext } from '../useEChartContext'
import { HeaderTabs } from './HeaderTabs'
import { defaultTab, HEADER_TAB, useHeaderTabs } from './useHeaderTabs'

interface Props {
    onSend(demographicDemographic: DemographicDocument): void
}

const Styles = styled.div`
    .scroll-container {
        height: 300px;
        overflow-y: auto;
    }
`

export default function PatientDocumentsList({ onSend }: Props) {
    const { demographic } = useEChartContext().demographic
    const {
        demographicDocuments,
        isLoading,
        getDocuments,
    } = useHttpDemographic()
    const { tabs, tabSelected, setTabSelected } = useHeaderTabs(defaultTab)

    useEffect(() => {
        if (!demographic) {
            return
        }
        getDocuments(demographic.demographicNo)
    }, [demographic, getDocuments])

    const documents = useMemo(
        () => demographicDocuments?.filter(i => i.type === 'document') ?? [],
        [demographicDocuments]
    )
    const eforms = useMemo(
        () => demographicDocuments?.filter(i => i.type === 'eform') ?? [],
        [demographicDocuments]
    )
    const forms = useMemo(
        () => demographicDocuments?.filter(i => i.type === 'forms') ?? [],
        [demographicDocuments]
    )

    const list = useMemo((): DemographicDocument[] => {
        switch (tabSelected.value) {
            case HEADER_TAB.DOCUMENTS: {
                return documents
            }
            case HEADER_TAB.EFORMS: {
                return eforms
            }
            case HEADER_TAB.FORMS: {
                return forms
            }
        }
    }, [tabSelected, documents, eforms, forms])

    return (
        <Styles>
            <HeaderTabs
                tabs={tabs}
                tabSelected={tabSelected}
                onChange={setTabSelected}
            />
            <div className="scroll-container">
                {list?.map(document => (
                    <DocumentItem
                        key={document.id}
                        document={document}
                        onClick={() => onSend(document)}
                    />
                ))}
                {!list.length && !isLoading && (
                    <TextHintStyles className="d-block m-4">
                        No files found
                    </TextHintStyles>
                )}
                {isLoading && (
                    <div className="p-4">
                        <Spinner size={SpinnerSize.SMALL} />
                    </div>
                )}
            </div>
        </Styles>
    )
}

const DocumentItemStyles = styled.div`
    padding: 4px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
`

const DocumentItem = ({
    document,
    onClick,
}: {
    document: DemographicDocument
    onClick: () => void
}) => {
    return (
        <DocumentItemStyles>
            <FontWeightBoldStyles className="">
                {document.title}
            </FontWeightBoldStyles>
            <div className="d-flex align-items-center">
                <div className="mr-3">
                    {moment(document.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                </div>
                <IconButton
                    intent="primary-fade"
                    icon="send"
                    tooltipContent="Send file"
                    onClick={onClick}
                />
            </div>
        </DocumentItemStyles>
    )
}
